from collections import Counter

from app.domain.entities.detection import VehicleDetection
from app.domain.enums import PriorityStatus, VehicleType


class DecisionMaker:
    """Turns raw detections into a compact traffic-priority decision."""

    VEHICLE_TYPES = {
        VehicleType.CAR,
        VehicleType.BUS,
        VehicleType.TRUCK,
        VehicleType.MOTORCYCLE,
        VehicleType.BICYCLE,
        VehicleType.EMERGENCY,
    }

    def decide(self, detections: list[VehicleDetection]) -> tuple[int, PriorityStatus, dict[VehicleType, int], int]:
        counts = Counter(
            detection.vehicle_type
            for detection in detections
            if detection.vehicle_type in self.VEHICLE_TYPES
        )
        vehicle_count = sum(counts.values())

        if counts[VehicleType.EMERGENCY] > 0 or vehicle_count > 30:
            return vehicle_count, PriorityStatus.CRITICAL, dict(counts), 90

        if vehicle_count > 15:
            return vehicle_count, PriorityStatus.HIGH, dict(counts), 70

        if vehicle_count > 5:
            return vehicle_count, PriorityStatus.MEDIUM, dict(counts), 50

        return vehicle_count, PriorityStatus.LOW, dict(counts), 30
