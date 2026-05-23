from collections.abc import Iterable
import logging
from pathlib import Path
from typing import Any

from Hakaton.backend.services.smart_traffic_service.app.application.ports.detection_model_port import DetectionModelPort
from Hakaton.backend.services.smart_traffic_service.app.domain.entities.detection import BoundingBox, VehicleDetection
from Hakaton.backend.services.smart_traffic_service.app.domain.enums import VehicleType


logger = logging.getLogger(__name__)


class YoloDetectorAdapter(DetectionModelPort):
    """YOLOv8 adapter for real video inference."""

    YOLO_TO_VEHICLE_TYPE = {
        "car": VehicleType.CAR,
        "bus": VehicleType.BUS,
        "truck": VehicleType.TRUCK,
        "motorcycle": VehicleType.MOTORCYCLE,
        "bicycle": VehicleType.BICYCLE,
        "ambulance": VehicleType.EMERGENCY,
        "fire truck": VehicleType.EMERGENCY,
    }

    def __init__(self, model_path: str = "yolov8n.pt", confidence_threshold: float = 0.35) -> None:
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self._model: Any | None = None

    def detect_stream(self, video_path: str) -> Iterable[list[VehicleDetection]]:
        source_path = self._resolve_video_path(video_path)
        if not source_path.exists():
            message = f"Video source not found: {source_path}"
            logger.error(message)
            raise FileNotFoundError(message)

        model = self._load_model()

        # Real YOLOv8 hook. You can add tracking, zones, lane mapping, or frame sampling here.
        for result in model.predict(source=str(source_path), stream=True, conf=self.confidence_threshold, verbose=False):
            yield self._map_yolo_result(result)

    def _load_model(self) -> Any:
        if self._model is not None:
            return self._model

        try:
            from ultralytics import YOLO
        except ImportError as exc:
            message = "ultralytics is not installed. Install the smart-traffic requirements before starting the backend."
            logger.exception(message)
            raise ImportError(message) from exc

        model_path = self._resolve_model_path()
        if not model_path.exists():
            message = f"YOLO weights not found: {model_path}"
            logger.error(message)
            raise FileNotFoundError(message)

        try:
            self._model = YOLO(str(model_path))
        except Exception as exc:
            message = f"Failed to load YOLO weights from {model_path}"
            logger.exception(message)
            raise RuntimeError(message) from exc

        return self._model

    def _resolve_model_path(self) -> Path:
        model_path = Path(self.model_path).expanduser()
        if model_path.is_absolute():
            return model_path

        service_root = Path(__file__).resolve().parents[3]
        return service_root / model_path

    def _resolve_video_path(self, video_path: str) -> Path:
        candidate = Path(video_path).expanduser()
        if candidate.exists():
            return candidate.resolve()

        service_root = Path(__file__).resolve().parents[3]
        service_candidate = service_root / candidate
        if service_candidate.exists():
            return service_candidate.resolve()

        return candidate

    def _map_yolo_result(self, result: Any) -> list[VehicleDetection]:
        detections: list[VehicleDetection] = []
        names = getattr(result, "names", {}) or {}
        boxes = getattr(result, "boxes", None)

        if boxes is None:
            return detections

        for box in boxes:
            confidence = float(box.conf[0])
            class_id = int(box.cls[0])
            raw_name = str(names.get(class_id, "unknown")).lower()
            vehicle_type = self.YOLO_TO_VEHICLE_TYPE.get(raw_name, VehicleType.UNKNOWN)

            if vehicle_type == VehicleType.UNKNOWN:
                continue

            x1, y1, x2, y2 = [float(value) for value in box.xyxy[0]]
            detections.append(
                VehicleDetection(
                    vehicle_type=vehicle_type,
                    confidence=confidence,
                    bbox=BoundingBox(
                        x=x1,
                        y=y1,
                        width=max(0.0, x2 - x1),
                        height=max(0.0, y2 - y1),
                        confidence=confidence,
                    ),
                )
            )

        return detections

