import unittest

from schemas import Coordinate, GreenWaveRequest
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
        self.assertEqual(result.target_light.id, "tl_001")
        self.assertGreaterEqual(len(result.considered_lights), 3)
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


if __name__ == "__main__":
    unittest.main()
