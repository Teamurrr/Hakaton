from fastapi import FastAPI, HTTPException

from schemas import GreenWaveRequest, GreenWaveResponse
from services.green_wave import GreenWaveCalculator

app = FastAPI(
    title="Bishkek Green Wave API",
    description="MVP backend for recommending vehicle speed to pass traffic lights on green.",
    version="0.1.0",
)

calculator = GreenWaveCalculator()


@app.get("/")
def home() -> dict[str, str]:
    return {"message": "Backend is working"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/green-wave/calculate", response_model=GreenWaveResponse)
def calculate_green_wave(payload: GreenWaveRequest) -> GreenWaveResponse:
    try:
        return calculator.calculate(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
