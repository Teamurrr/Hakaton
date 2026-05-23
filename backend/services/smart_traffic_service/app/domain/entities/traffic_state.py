from dataclasses import dataclass
from datetime import datetime

from Hakaton.backend.services.smart_traffic_service.app.domain.entities.detection import VehicleDetection
from Hakaton.backend.services.smart_traffic_service.app.domain.enums import PriorityStatus, VehicleType


@dataclass(frozen=True)
class TrafficState:
    video_path: str
    frame_index: int
    timestamp: datetime
    vehicle_count: int
    priority_status: PriorityStatus
    vehicle_counts_by_type: dict[VehicleType, int]
    detections: list[VehicleDetection]
    recommended_green_seconds: int
