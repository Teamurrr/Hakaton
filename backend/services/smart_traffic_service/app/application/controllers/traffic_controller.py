import asyncio
import threading
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, BinaryIO
from urllib.parse import urlparse, unquote

from app.application.ports.detection_model_port import DetectionModelPort
from app.application.services.decision_maker import DecisionMaker
from app.domain.entities.traffic_state import TrafficState


SERVICE_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_VIDEO_PATH = SERVICE_ROOT / "Road traffic video for object recognition.mp4"
SAMPLE_VIDEO_ROUTE = "/smart-traffic/sample-video.mp4"
_STREAM_END = object()


class TrafficController:
    """Coordinates video detection and traffic-priority decisions."""

    def __init__(
        self,
        detector: DetectionModelPort,
        decision_maker: DecisionMaker,
        frame_interval_seconds: float = 0.4,
    ) -> None:
        self.detector = detector
        self.decision_maker = decision_maker
        self.frame_interval_seconds = frame_interval_seconds
        self._monitoring_source: Path | None = None
        self._monitoring_status: str = "stopped"
        self._monitoring_error: str | None = None
        self._latest_state: TrafficState | None = None
        self._latest_state_version = 0
        self._state_lock = threading.Lock()
        self._analysis_stop_event = threading.Event()
        self._analysis_thread: threading.Thread | None = None

    def start_hls_monitoring(self, stream_url: str) -> dict[str, str | None]:
        source_path = self._resolve_video_source(stream_url)
        self._stop_analysis_worker()
        self._monitoring_source = source_path
        self._monitoring_status = "running"
        self._monitoring_error = None
        self._analysis_stop_event = threading.Event()
        self._analysis_thread = threading.Thread(
            target=self._run_monitoring_analysis,
            args=(source_path, self._analysis_stop_event),
            daemon=True,
        )
        with self._state_lock:
            self._latest_state = None
            self._latest_state_version += 1

        self._analysis_thread.start()
        return {"status": self._monitoring_status, "stream_url": str(source_path), "error": None}

    def stop_hls_monitoring(self) -> dict[str, str | None]:
        self._stop_analysis_worker()
        self._monitoring_source = None
        self._monitoring_status = "stopped"
        self._monitoring_error = None
        with self._state_lock:
            self._latest_state = None
            self._latest_state_version += 1

        return {"status": self._monitoring_status, "stream_url": None, "error": None}

    def get_hls_monitoring_status(self) -> dict[str, str | None]:
        if self._monitoring_status == "running" and self._analysis_thread and not self._analysis_thread.is_alive():
            self._monitoring_status = "stopped"

        return {
            "status": self._monitoring_status,
            "stream_url": str(self._monitoring_source) if self._monitoring_source else None,
            "error": self._monitoring_error,
        }

    def get_latest_state(self) -> TrafficState | None:
        with self._state_lock:
            return self._latest_state

    def get_latest_state_version(self) -> int:
        with self._state_lock:
            return self._latest_state_version

    def iter_processed_mjpeg_frames(self):
        source_path = self._monitoring_source or DEFAULT_VIDEO_PATH

        try:
            import cv2
        except ImportError as exc:
            self._monitoring_status = "error"
            self._monitoring_error = "opencv-python is required for processed video streaming"
            raise ImportError(self._monitoring_error) from exc

        capture = cv2.VideoCapture(str(source_path))
        if not capture.isOpened():
            self._monitoring_status = "error"
            self._monitoring_error = f"Unable to open video source: {source_path}"
            raise FileNotFoundError(self._monitoring_error)

        try:
            detections_iter = self.detector.detect_stream(str(source_path))
            while True:
                success, frame = capture.read()
                if not success:
                    break

                try:
                    detections = next(detections_iter)
                except StopIteration:
                    break

                annotated_frame = self._draw_detections(frame, detections)
                success, encoded = cv2.imencode('.jpg', annotated_frame)
                if not success:
                    continue

                yield (
                    b'--frame\r\n'
                    b'Content-Type: image/jpeg\r\n\r\n' + encoded.tobytes() + b'\r\n'
                )
        finally:
            capture.release()

    def _draw_detections(self, frame, detections):
        try:
            import cv2
        except ImportError:
            return frame

        for detection in detections:
            box = detection.bbox
            top_left = (int(box.x), int(box.y))
            bottom_right = (int(box.x + box.width), int(box.y + box.height))
            cv2.rectangle(frame, top_left, bottom_right, (0, 255, 0), 2)
            label = f"{detection.vehicle_type.value}:{detection.confidence:.2f}"
            cv2.putText(frame, label, (top_left[0], max(20, top_left[1] - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

        return frame

    def _resolve_video_source(self, stream_url: str) -> Path:
        candidate = Path(unquote(stream_url)).expanduser()
        if candidate.exists():
            return candidate.resolve()

        parsed = urlparse(stream_url)
        if parsed.scheme in {"http", "https"}:
            if parsed.path.endswith(SAMPLE_VIDEO_ROUTE):
                return DEFAULT_VIDEO_PATH

            local_name = Path(unquote(parsed.path)).name
            if local_name:
                local_candidate = SERVICE_ROOT / local_name
                if local_candidate.exists():
                    return local_candidate.resolve()

        if not candidate.is_absolute():
            service_candidate = SERVICE_ROOT / candidate
            if service_candidate.exists():
                return service_candidate.resolve()

        raise FileNotFoundError(f"Video source not found: {stream_url}")

    async def process_video_stream(self, video_path: str) -> AsyncIterator[TrafficState]:
        """Imitate video stream processing and yield current traffic state."""
        self.start_hls_monitoring(video_path)
        last_version = -1

        while True:
            if self._monitoring_status == "error":
                message = self._monitoring_error or "Traffic analysis failed"
                raise RuntimeError(message)

            version = self.get_latest_state_version()
            latest_state = self.get_latest_state()

            if latest_state is not None and version != last_version:
                last_version = version
                yield latest_state

            await asyncio.sleep(0.2)

    @staticmethod
    def _next_detection_batch(detections_iter: Any):
        try:
            return next(detections_iter)
        except StopIteration:
            return _STREAM_END

    def _stop_analysis_worker(self) -> None:
        if self._analysis_thread and self._analysis_thread.is_alive():
            self._analysis_stop_event.set()
            self._analysis_thread.join(timeout=1.5)

        self._analysis_thread = None

    def _run_monitoring_analysis(self, source_path: Path, stop_event: threading.Event) -> None:
        detect_frame = getattr(self.detector, "detect_frame", None)
        if callable(detect_frame):
            self._run_frame_monitoring_analysis(source_path, stop_event, detect_frame)
            return

        self._run_stream_monitoring_analysis(source_path, stop_event)

    def _run_frame_monitoring_analysis(self, source_path: Path, stop_event: threading.Event, detect_frame: Any) -> None:
        try:
            import cv2
        except ImportError:
            self._run_stream_monitoring_analysis(source_path, stop_event)
            return

        capture = cv2.VideoCapture(str(source_path))
        if not capture.isOpened():
            self._monitoring_status = "error"
            self._monitoring_error = f"Unable to open video source: {source_path}"
            return

        frame_index = 0

        try:
            while not stop_event.is_set():
                success, frame = capture.read()
                if not success:
                    capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    frame_index = 0
                    continue

                frame_index += 1
                if frame_index % 12 != 0:
                    continue

                detections = detect_frame(frame)
                self._publish_traffic_state(source_path, frame_index, detections)

                if stop_event.wait(self.frame_interval_seconds):
                    break
        except Exception as exc:
            self._monitoring_status = "error"
            self._monitoring_error = str(exc)
        finally:
            capture.release()

    def _run_stream_monitoring_analysis(self, source_path: Path, stop_event: threading.Event) -> None:
        try:
            detections_iter = iter(self.detector.detect_stream(str(source_path)))

            for frame_index in range(1, 100_000_000):
                if stop_event.is_set():
                    break

                detections = self._next_detection_batch(detections_iter)
                if detections is _STREAM_END:
                    break

                self._publish_traffic_state(source_path, frame_index, detections)

                if stop_event.wait(self.frame_interval_seconds):
                    break

            if not stop_event.is_set():
                self._monitoring_status = "stopped"
        except Exception as exc:
            self._monitoring_status = "error"
            self._monitoring_error = str(exc)

    def _publish_traffic_state(self, source_path: Path, frame_index: int, detections: Any) -> None:
        vehicle_count, priority_status, counts_by_type, green_seconds = self.decision_maker.decide(detections)
        traffic_state = TrafficState(
            video_path=str(source_path),
            frame_index=frame_index,
            timestamp=datetime.now(UTC),
            vehicle_count=vehicle_count,
            priority_status=priority_status,
            vehicle_counts_by_type=counts_by_type,
            detections=detections,
            recommended_green_seconds=green_seconds,
        )

        with self._state_lock:
            self._latest_state = traffic_state
            self._latest_state_version += 1
