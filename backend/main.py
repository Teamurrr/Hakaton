from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from schemas import (
    GreenWaveRequest,
    GreenWaveResponse,
    RouteTrafficLightsSyncRequest,
    RouteTrafficLightsSyncResponse,
)
from services.green_wave import GreenWaveCalculator

app = FastAPI(
    title="Bishkek Green Wave API",
    description="MVP backend for recommending vehicle speed to pass traffic lights on green.",
    version="0.1.0",
)

calculator = GreenWaveCalculator()
latest_route_traffic_lights: RouteTrafficLightsSyncRequest | None = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:4173", "http://localhost:4173", "http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home() -> dict[str, str]:
    return {"message": "Backend is working"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/green-wave/calculate", response_model=GreenWaveResponse)
def calculate_green_wave(payload: GreenWaveRequest) -> GreenWaveResponse:
    try:
        return calculator.calculate(payload, latest_route_traffic_lights)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/traffic-lights/sync", response_model=RouteTrafficLightsSyncResponse)
def sync_route_traffic_lights(
    payload: RouteTrafficLightsSyncRequest,
) -> RouteTrafficLightsSyncResponse:
    global latest_route_traffic_lights
    latest_route_traffic_lights = payload
    return RouteTrafficLightsSyncResponse(
        status="ok",
        synced_count=len(payload.traffic_lights),
    )


@app.get("/traffic-lights/latest", response_model=RouteTrafficLightsSyncRequest | None)
def get_latest_route_traffic_lights() -> RouteTrafficLightsSyncRequest | None:
    return latest_route_traffic_lights
