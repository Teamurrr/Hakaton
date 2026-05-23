import asyncio
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from pathlib import Path
from typing import BinaryIO
from urllib.parse import urlparse, unquote

from Hakaton.backend.services.smart_traffic_service.app.application.ports.detection_model_port import DetectionModelPort
from Hakaton.backend.services.smart_traffic_service.app.application.services.decision_maker import DecisionMaker
from Hakaton.backend.services.smart_traffic_service.app.domain.entities.traffic_state import TrafficState


SERVICE_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_VIDEO_PATH = SERVICE_ROOT / "Road traffic video for object recognition.mp4"


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

    def start_hls_monitoring(self, stream_url: str) -> dict[str, str | None]:
        source_path = self._resolve_video_source(stream_url)
        self._monitoring_source = source_path
        self._monitoring_status = "running"
        self._monitoring_error = None
        return {"status": self._monitoring_status, "stream_url": str(source_path), "error": None}

    def stop_hls_monitoring(self) -> dict[str, str | None]:
        self._monitoring_source = None
        self._monitoring_status = "stopped"
        self._monitoring_error = None
        return {"status": self._monitoring_status, "stream_url": None, "error": None}

    def get_hls_monitoring_status(self) -> dict[str, str | None]:
        return {
            "status": self._monitoring_status,
            "stream_url": str(self._monitoring_source) if self._monitoring_source else None,
            "error": self._monitoring_error,
        }

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
        for frame_index, detections in enumerate(self.detector.detect_stream(video_path), start=1):
            vehicle_count, priority_status, counts_by_type, green_seconds = self.decision_maker.decide(
                detections
            )

            yield TrafficState(
                video_path=video_path,
                frame_index=frame_index,
                timestamp=datetime.now(UTC),
                vehicle_count=vehicle_count,
                priority_status=priority_status,
                vehicle_counts_by_type=counts_by_type,
                detections=detections,
                recommended_green_seconds=green_seconds,
            )

            await asyncio.sleep(self.frame_interval_seconds)
