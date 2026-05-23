import json
from dataclasses import dataclass
from datetime import datetime
from math import atan2, cos, radians, sin, sqrt
from pathlib import Path

from schemas import (
    Coordinate,
    GreenWaveRequest,
    GreenWaveResponse,
    GreenWindow,
    RouteTrafficLightsSyncRequest,
    TrafficLightInfo,
)


EARTH_RADIUS_M = 6_371_000
DEFAULT_ROUTE_CORRIDOR_M = 80
GREEN_WINDOW_SEARCH_CYCLES = 6
GREEN_WAVE_START_SEARCH_SEC = 180
GREEN_WAVE_SPEED_STEP_KMH = 0.5


@dataclass(frozen=True)
class TrafficLight:
    id: str
    name: str
    lon: float
    lat: float
    cycle_duration_sec: int
    green_start_sec: int
    green_duration_sec: int


class GreenWaveCalculator:
    def __init__(self, data_path: Path | None = None) -> None:
        if data_path is None:
            data_path = Path(__file__).resolve().parent.parent / "data" / "traffic_lights.json"
        self._traffic_lights = self._load_traffic_lights(data_path)

    def calculate(
        self,
        payload: GreenWaveRequest,
        synced_route: RouteTrafficLightsSyncRequest | None = None,
    ) -> GreenWaveResponse:
        if payload.min_speed_kmh > payload.max_speed_kmh:
            raise ValueError("min_speed_kmh must be less than or equal to max_speed_kmh")

        synced_route_lights = self._find_synced_route_lights(payload, synced_route)
        route_distance_m = (
            synced_route.route_distance_m
            if synced_route_lights and synced_route is not None
            else haversine_m(payload.start, payload.end)
        )
        if route_distance_m < 5:
            raise ValueError("Route is too short to calculate a green wave")

        route_lights = synced_route_lights or self._find_route_lights(payload.start, payload.end)
        if not route_lights:
            raise ValueError("No traffic lights found near the selected route")

        next_light, considered_lights = route_lights[0], route_lights
        now_sec = payload.current_time_sec if payload.current_time_sec is not None else seconds_since_midnight()
        preferred_speed_kmh = clamp(45, payload.min_speed_kmh, payload.max_speed_kmh)
        current_speed_kmh = payload.current_speed_kmh or preferred_speed_kmh

        current_arrival_sec = route_time_sec(next_light["distance_from_start_m"], current_speed_kmh)
        reachable_now = is_green_at_arrival(next_light["light"], now_sec + current_arrival_sec)

        recommendation = self._find_speed_for_route(
            route_lights=considered_lights,
            now_sec=now_sec,
            preferred_speed_kmh=preferred_speed_kmh,
            min_speed_kmh=payload.min_speed_kmh,
            max_speed_kmh=payload.max_speed_kmh,
        )

        target_route_light = recommendation["target_route_light"]
        assert isinstance(target_route_light, dict)
        target_light = to_light_info(target_route_light)
        considered = [to_light_info(light) for light in considered_lights]

        return GreenWaveResponse(
            recommended_speed_kmh=round(recommendation["speed_kmh"], 1),
            current_speed_kmh=payload.current_speed_kmh,
            calculated_at_sec=now_sec,
            departure_delay_sec=int(recommendation["departure_delay_sec"]),
            expected_stops_count=int(recommendation["red_count"]),
            expected_wait_sec=int(recommendation["total_wait_sec"]),
            route_distance_m=round(route_distance_m, 1),
            target_arrival_in_sec=recommendation["arrival_in_sec"],
            next_light_green_in_sec=recommendation["green_window_start_in_sec"],
            advice=(
                "follow_recommendation"
                if payload.current_speed_kmh is None
                else build_advice(
                    current_speed_kmh=payload.current_speed_kmh,
                    recommended_speed_kmh=float(recommendation["speed_kmh"]),
                    green_wave_available=bool(recommendation["green_wave_available"]),
                )
            ),
            green_wave_available=bool(recommendation["green_wave_available"]),
            reachable_on_current_speed=reachable_now,
            target_light=target_light,
            considered_lights=considered,
            green_window=GreenWindow(
                start_in_sec=recommendation["green_window_start_in_sec"],
                end_in_sec=recommendation["green_window_end_in_sec"],
            ),
        )

    def _find_speed_for_route(
        self,
        route_lights: list[dict[str, float | TrafficLight]],
        now_sec: int,
        preferred_speed_kmh: float,
        min_speed_kmh: float,
        max_speed_kmh: float,
    ) -> dict[str, float | int | bool | dict[str, float | TrafficLight]]:
        best_option: dict[str, float | int | bool | dict[str, float | TrafficLight]] | None = None
        speed = min_speed_kmh

        while speed <= max_speed_kmh + 0.001:
            for departure_delay_sec in range(GREEN_WAVE_START_SEARCH_SEC + 1):
                option = self._score_speed_for_route(
                    route_lights=route_lights,
                    now_sec=now_sec,
                    speed_kmh=speed,
                    departure_delay_sec=departure_delay_sec,
                    preferred_speed_kmh=preferred_speed_kmh,
                )

                if best_option is None or self._route_option_key(option) < self._route_option_key(
                    best_option
                ):
                    best_option = option

                if int(option["red_count"]) == 0 and departure_delay_sec == 0:
                    break

            speed += GREEN_WAVE_SPEED_STEP_KMH

        assert best_option is not None
        return best_option

    def _score_speed_for_route(
        self,
        route_lights: list[dict[str, float | TrafficLight]],
        now_sec: int,
        speed_kmh: float,
        departure_delay_sec: int,
        preferred_speed_kmh: float,
    ) -> dict[str, float | int | bool | dict[str, float | TrafficLight]]:
        total_wait_sec = 0
        green_count = 0
        red_count = 0
        first_blocking_light = route_lights[0]
        first_blocking_wait_sec = 0
        first_blocking_arrival_sec = route_time_sec(
            float(first_blocking_light["distance_from_start_m"]),
            speed_kmh,
        )

        for route_light in route_lights:
            light = route_light["light"]
            assert isinstance(light, TrafficLight)

            arrival_sec = route_time_sec(float(route_light["distance_from_start_m"]), speed_kmh)
            absolute_arrival_sec = now_sec + departure_delay_sec + arrival_sec

            if is_green_at_arrival(light, absolute_arrival_sec):
                green_count += 1
                continue

            wait_sec = seconds_until_next_green(light, absolute_arrival_sec)
            total_wait_sec += wait_sec
            red_count += 1

            if red_count == 1:
                first_blocking_light = route_light
                first_blocking_wait_sec = wait_sec
                first_blocking_arrival_sec = arrival_sec

        return {
            "speed_kmh": speed_kmh,
            "arrival_in_sec": first_blocking_arrival_sec,
            "departure_delay_sec": departure_delay_sec,
            "green_window_start_in_sec": first_blocking_wait_sec,
            "green_window_end_in_sec": first_blocking_wait_sec
            + get_light_from_route_light(first_blocking_light).green_duration_sec,
            "green_wave_available": red_count == 0,
            "green_count": green_count,
            "red_count": red_count,
            "speed_delta": abs(speed_kmh - preferred_speed_kmh),
            "target_route_light": first_blocking_light,
            "total_wait_sec": total_wait_sec,
        }

    @staticmethod
    def _route_option_key(
        option: dict[str, float | int | bool | dict[str, float | TrafficLight]]
    ) -> tuple[int, int, int, float, float]:
        return (
            int(option["red_count"]),
            int(option["total_wait_sec"]),
            int(option["departure_delay_sec"]),
            float(option["speed_delta"]),
            float(option["speed_kmh"]),
        )

    def _find_speed_for_green_window(
        self,
        distance_m: float,
        now_sec: int,
        current_speed_kmh: float,
        min_speed_kmh: float,
        max_speed_kmh: float,
        light: TrafficLight,
    ) -> dict[str, float | int]:
        best_option: dict[str, float | int] | None = None

        for cycle_index in range(GREEN_WINDOW_SEARCH_CYCLES):
            green_start = next_green_start(light, now_sec, cycle_index)
            green_end = green_start + light.green_duration_sec

            earliest_arrival = max(1, green_start - now_sec)
            latest_arrival = max(1, green_end - now_sec)

            min_viable_speed = speed_for_distance(distance_m, latest_arrival)
            max_viable_speed = speed_for_distance(distance_m, earliest_arrival)

            lower = max(min_speed_kmh, min_viable_speed)
            upper = min(max_speed_kmh, max_viable_speed)

            if lower > upper:
                continue

            speed = clamp(current_speed_kmh, lower, upper)
            arrival_in_sec = max(1, round(time_for_distance(distance_m, speed)))

            option = {
                "speed_kmh": speed,
                "arrival_in_sec": arrival_in_sec,
                "green_window_start_in_sec": green_start - now_sec,
                "green_window_end_in_sec": green_end - now_sec,
                "speed_delta": abs(speed - current_speed_kmh),
                "green_wave_available": True,
            }

            if best_option is None:
                best_option = option
                continue

            if option["green_window_start_in_sec"] < best_option["green_window_start_in_sec"]:
                best_option = option
            elif (
                option["green_window_start_in_sec"] == best_option["green_window_start_in_sec"]
                and option["speed_delta"] < best_option["speed_delta"]
            ):
                best_option = option

        if best_option is not None:
            return best_option

        fallback_speed = min_speed_kmh
        arrival_in_sec = max(1, round(time_for_distance(distance_m, fallback_speed)))
        green_start = next_green_start(light, now_sec, 0)
        green_end = green_start + light.green_duration_sec
        return {
            "speed_kmh": fallback_speed,
            "arrival_in_sec": arrival_in_sec,
            "green_window_start_in_sec": green_start - now_sec,
            "green_window_end_in_sec": green_end - now_sec,
            "speed_delta": abs(fallback_speed - current_speed_kmh),
            "green_wave_available": False,
        }

    def _find_route_lights(self, start: Coordinate, end: Coordinate) -> list[dict[str, float | TrafficLight]]:
        route_lights: list[dict[str, float | TrafficLight]] = []

        for light in self._traffic_lights:
            projection, distance_to_route_m = project_point_to_segment(
                start.lon,
                start.lat,
                end.lon,
                end.lat,
                light.lon,
                light.lat,
            )

            if not 0 <= projection <= 1:
                continue
            if distance_to_route_m > DEFAULT_ROUTE_CORRIDOR_M:
                continue

            distance_from_start_m = haversine_m(
                start,
                Coordinate(lon=start.lon + (end.lon - start.lon) * projection, lat=start.lat + (end.lat - start.lat) * projection),
            )

            route_lights.append(
                {
                    "light": light,
                    "distance_from_start_m": distance_from_start_m,
                    "distance_to_route_m": distance_to_route_m,
                }
            )

        route_lights.sort(key=lambda item: float(item["distance_from_start_m"]))
        return route_lights

    def _find_synced_route_lights(
        self,
        payload: GreenWaveRequest,
        synced_route: RouteTrafficLightsSyncRequest | None,
    ) -> list[dict[str, float | TrafficLight]]:
        if synced_route is None:
            return []

        if (
            haversine_m(payload.start, synced_route.start) > DEFAULT_ROUTE_CORRIDOR_M
            or haversine_m(payload.end, synced_route.end) > DEFAULT_ROUTE_CORRIDOR_M
        ):
            return []

        lights_by_id = {light.id: light for light in self._traffic_lights}
        route_lights: list[dict[str, float | TrafficLight]] = []

        for synced_light in synced_route.traffic_lights:
            light = lights_by_id.get(synced_light.id)
            if light is None:
                continue

            route_lights.append(
                {
                    "distance_from_start_m": synced_light.distance_from_start_m,
                    "distance_to_route_m": 0,
                    "light": light,
                }
            )

        route_lights.sort(key=lambda item: float(item["distance_from_start_m"]))
        return route_lights

    @staticmethod
    def _load_traffic_lights(data_path: Path) -> list[TrafficLight]:
        with data_path.open("r", encoding="utf-8") as file:
            raw_lights = json.load(file)

        return [TrafficLight(**item) for item in raw_lights]


def seconds_since_midnight() -> int:
    now = datetime.now()
    return now.hour * 3600 + now.minute * 60 + now.second


def haversine_m(start: Coordinate, end: Coordinate) -> float:
    lat1 = radians(start.lat)
    lon1 = radians(start.lon)
    lat2 = radians(end.lat)
    lon2 = radians(end.lon)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return EARTH_RADIUS_M * c


def project_point_to_segment(
    start_lon: float,
    start_lat: float,
    end_lon: float,
    end_lat: float,
    point_lon: float,
    point_lat: float,
) -> tuple[float, float]:
    mean_lat = radians((start_lat + end_lat + point_lat) / 3)
    scale_x = 111_320 * cos(mean_lat)
    scale_y = 110_540

    ax = start_lon * scale_x
    ay = start_lat * scale_y
    bx = end_lon * scale_x
    by = end_lat * scale_y
    px = point_lon * scale_x
    py = point_lat * scale_y

    abx = bx - ax
    aby = by - ay
    apx = px - ax
    apy = py - ay

    ab_len_sq = abx * abx + aby * aby
    if ab_len_sq == 0:
        distance = sqrt(apx * apx + apy * apy)
        return 0.0, distance

    projection = (apx * abx + apy * aby) / ab_len_sq
    projection_clamped = clamp(projection, 0.0, 1.0)

    closest_x = ax + abx * projection_clamped
    closest_y = ay + aby * projection_clamped
    distance = sqrt((px - closest_x) ** 2 + (py - closest_y) ** 2)
    return projection, distance


def route_time_sec(distance_m: float, speed_kmh: float) -> int:
    return max(1, round(time_for_distance(distance_m, speed_kmh)))


def time_for_distance(distance_m: float, speed_kmh: float) -> float:
    speed_mps = speed_kmh / 3.6
    return distance_m / speed_mps


def speed_for_distance(distance_m: float, arrival_time_sec: int) -> float:
    return (distance_m / arrival_time_sec) * 3.6


def next_green_start(light: TrafficLight, now_sec: int, cycle_offset: int) -> int:
    base_cycle_start = now_sec - (now_sec % light.cycle_duration_sec)
    green_start = base_cycle_start + light.green_start_sec

    if green_start < now_sec:
        green_start += light.cycle_duration_sec

    green_start += light.cycle_duration_sec * cycle_offset
    return green_start


def is_green_at_arrival(light: TrafficLight, absolute_arrival_sec: int) -> bool:
    phase = absolute_arrival_sec % light.cycle_duration_sec
    green_end = light.green_start_sec + light.green_duration_sec
    return light.green_start_sec <= phase <= green_end


def seconds_until_next_green(light: TrafficLight, absolute_sec: int) -> int:
    phase = absolute_sec % light.cycle_duration_sec

    if is_green_at_arrival(light, absolute_sec):
        return 0
    if phase < light.green_start_sec:
        return light.green_start_sec - phase

    return light.cycle_duration_sec - phase + light.green_start_sec


def get_light_from_route_light(route_light: dict[str, float | TrafficLight]) -> TrafficLight:
    light = route_light["light"]
    assert isinstance(light, TrafficLight)
    return light


def to_light_info(route_light: dict[str, float | TrafficLight]) -> TrafficLightInfo:
    light = get_light_from_route_light(route_light)
    return TrafficLightInfo(
        id=light.id,
        name=light.name,
        distance_from_start_m=round(float(route_light["distance_from_start_m"]), 1),
        distance_to_route_m=round(float(route_light["distance_to_route_m"]), 1),
        cycle_duration_sec=light.cycle_duration_sec,
        green_start_sec=light.green_start_sec,
        green_duration_sec=light.green_duration_sec,
    )


def build_advice(
    current_speed_kmh: float,
    recommended_speed_kmh: float,
    green_wave_available: bool,
) -> str:
    if not green_wave_available:
        return "prepare_to_stop"

    delta = recommended_speed_kmh - current_speed_kmh
    if abs(delta) < 2:
        return "maintain_speed"
    if delta > 0:
        return "speed_up"
    return "slow_down"


def clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(value, upper))
