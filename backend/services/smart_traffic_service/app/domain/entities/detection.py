from dataclasses import dataclass

from app.domain.enums import VehicleType


@dataclass(frozen=True)
class BoundingBox:
    x: float
    y: float
    width: float
    height: float
    confidence: float


@dataclass(frozen=True)
class VehicleDetection:
    vehicle_type: VehicleType
    confidence: float
    bbox: BoundingBox
