from abc import ABC, abstractmethod
from collections.abc import Iterable

from app.domain.entities.detection import VehicleDetection


class DetectionModelPort(ABC):
    @abstractmethod
    def detect_stream(self, video_path: str) -> Iterable[list[VehicleDetection]]:
        """Yield vehicle detections frame-by-frame for a video source."""
