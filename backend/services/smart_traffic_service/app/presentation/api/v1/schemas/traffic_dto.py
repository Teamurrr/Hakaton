from datetime import datetime

from pydantic import BaseModel, Field

from app.domain.entities.detection import BoundingBox, VehicleDetection
from app.domain.entities.traffic_state import TrafficState
from app.domain.enums import PriorityStatus, VehicleType


class BoundingBoxDTO(BaseModel):
    x: float
    y: float
    width: float
    height: float
    confidence: float = Field(..., ge=0, le=1)

    @classmethod
    def from_domain(cls, bbox: BoundingBox) -> "BoundingBoxDTO":
        return cls(
            x=bbox.x,
            y=bbox.y,
            width=bbox.width,
            height=bbox.height,
            confidence=bbox.confidence,
        )


class VehicleDetectionDTO(BaseModel):
    vehicle_type: VehicleType
    confidence: float = Field(..., ge=0, le=1)
    bbox: BoundingBoxDTO

    @classmethod
    def from_domain(cls, detection: VehicleDetection) -> "VehicleDetectionDTO":
        return cls(
            vehicle_type=detection.vehicle_type,
            confidence=detection.confidence,
            bbox=BoundingBoxDTO.from_domain(detection.bbox),
        )


class TrafficStateDTO(BaseModel):
    video_path: str
    frame_index: int
    timestamp: datetime
    vehicle_count: int
    priority_status: PriorityStatus
    vehicle_counts_by_type: dict[VehicleType, int]
    recommended_green_seconds: int
    detections: list[VehicleDetectionDTO]

    @classmethod
    def from_domain(cls, state: TrafficState) -> "TrafficStateDTO":
        return cls(
            video_path=state.video_path,
            frame_index=state.frame_index,
            timestamp=state.timestamp,
            vehicle_count=state.vehicle_count,
            priority_status=state.priority_status,
            vehicle_counts_by_type=state.vehicle_counts_by_type,
            recommended_green_seconds=state.recommended_green_seconds,
            detections=[VehicleDetectionDTO.from_domain(item) for item in state.detections],
        )


class SmartTrafficEventDTO(BaseModel):
    event: str = "traffic_state_changed"
    payload: TrafficStateDTO
