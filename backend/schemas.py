from pydantic import BaseModel, Field


class Coordinate(BaseModel):
    lon: float = Field(..., description="Longitude")
    lat: float = Field(..., description="Latitude")


class SyncedTrafficLight(BaseModel):
    id: str
    name: str
    lat: float
    lon: float
    distance_from_start_m: float


class GreenWaveRequest(BaseModel):
    start: Coordinate
    end: Coordinate
    current_speed_kmh: float | None = Field(None, gt=0, le=120)
    min_speed_kmh: float = Field(20, gt=0, le=120)
    max_speed_kmh: float = Field(80, gt=0, le=120)
    current_time_sec: int | None = Field(
        None,
        ge=0,
        le=86399,
        description="Seconds since start of day. If omitted, server local time is used.",
    )


class TrafficLightInfo(BaseModel):
    id: str
    name: str
    distance_from_start_m: float
    distance_to_route_m: float
    cycle_duration_sec: int
    green_start_sec: int
    green_duration_sec: int


class GreenWindow(BaseModel):
    start_in_sec: int
    end_in_sec: int


class GreenWaveResponse(BaseModel):
    recommended_speed_kmh: float
    current_speed_kmh: float | None
    route_distance_m: float
    target_arrival_in_sec: int
    next_light_green_in_sec: int
    advice: str
    green_wave_available: bool
    reachable_on_current_speed: bool
    target_light: TrafficLightInfo
    considered_lights: list[TrafficLightInfo]
    green_window: GreenWindow


class RouteTrafficLightsSyncRequest(BaseModel):
    source: str = Field(..., description="Source map provider or client module")
    start: Coordinate
    end: Coordinate
    route_distance_m: float = Field(..., ge=0)
    traffic_lights: list[SyncedTrafficLight] = Field(default_factory=list)


class RouteTrafficLightsSyncResponse(BaseModel):
    status: str
    synced_count: int
