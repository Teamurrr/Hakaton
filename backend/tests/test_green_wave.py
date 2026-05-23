import unittest

from schemas import Coordinate, GreenWaveRequest, RouteTrafficLightsSyncRequest, SyncedTrafficLight
from services.green_wave import GreenWaveCalculator


class GreenWaveCalculatorTests(unittest.TestCase):
    def setUp(self) -> None:
        self.calculator = GreenWaveCalculator()

    def test_calculate_returns_recommendation_for_chui_route(self) -> None:
        payload = GreenWaveRequest(
            start=Coordinate(lon=74.5865, lat=42.8764),
            end=Coordinate(lon=74.6075, lat=42.8770),
            current_speed_kmh=45,
            current_time_sec=120,
        )

        result = self.calculator.calculate(payload)

        self.assertGreater(result.recommended_speed_kmh, 0)
        self.assertIn(result.target_light.id, {"tl_001", "tl_103"})
        self.assertGreaterEqual(len(result.considered_lights), 3)
        self.assertIn("tl_001", {light.id for light in result.considered_lights})
        self.assertIn(
            result.advice,
            {"maintain_speed", "speed_up", "slow_down", "prepare_to_stop"},
        )
        self.assertIn(result.green_wave_available, {True, False})

    def test_invalid_speed_bounds_raise_error(self) -> None:
        payload = GreenWaveRequest(
            start=Coordinate(lon=74.5865, lat=42.8764),
            end=Coordinate(lon=74.6075, lat=42.8770),
            current_speed_kmh=45,
            min_speed_kmh=60,
            max_speed_kmh=40,
            current_time_sec=120,
        )

        with self.assertRaises(ValueError):
            self.calculator.calculate(payload)

    def test_recommendation_does_not_depend_on_current_speed(self) -> None:
        base_payload = {
            "start": Coordinate(lon=74.5889, lat=42.8839),
            "end": Coordinate(lon=74.5866, lat=42.8537),
            "current_time_sec": 120,
        }

        without_current_speed = self.calculator.calculate(GreenWaveRequest(**base_payload))
        slow_current_speed = self.calculator.calculate(
            GreenWaveRequest(**base_payload, current_speed_kmh=20)
        )
        fast_current_speed = self.calculator.calculate(
            GreenWaveRequest(**base_payload, current_speed_kmh=70)
        )

        self.assertEqual(
            without_current_speed.recommended_speed_kmh,
            slow_current_speed.recommended_speed_kmh,
        )
        self.assertEqual(
            without_current_speed.recommended_speed_kmh,
            fast_current_speed.recommended_speed_kmh,
        )

    def test_calculate_uses_synced_route_lights_when_available(self) -> None:
        payload = GreenWaveRequest(
            start=Coordinate(lon=74.5889, lat=42.8839),
            end=Coordinate(lon=74.5866, lat=42.8537),
            current_time_sec=120,
        )
        synced_route = RouteTrafficLightsSyncRequest(
            source="test",
            start=payload.start,
            end=payload.end,
            route_distance_m=1234,
            traffic_lights=[
                SyncedTrafficLight(
                    id="tl_103",
                    name="Manas corridor signal 3",
                    lat=42.8765928,
                    lon=74.5882993,
                    distance_from_start_m=321,
                )
            ],
        )

        result = self.calculator.calculate(payload, synced_route)

        self.assertEqual(result.route_distance_m, 1234)
        self.assertEqual([light.id for light in result.considered_lights], ["tl_103"])
        self.assertEqual(result.considered_lights[0].distance_from_start_m, 321)


if __name__ == "__main__":
    unittest.main()
