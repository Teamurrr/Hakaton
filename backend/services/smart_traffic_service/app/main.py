from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.presentation.api.v1.routes.hls_monitoring import router as monitoring_router
from app.presentation.ws.traffic_events_ws import router as traffic_ws_router

SERVICE_ROOT = Path(__file__).resolve().parents[1]
SAMPLE_VIDEO_PATH = SERVICE_ROOT / "Road traffic video for object recognition.mp4"
UPLOADS_DIR = SERVICE_ROOT / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)


app = FastAPI(
    title="SmartTrafficLite API",
    description="Isolated backend module for traffic video analysis and priority streaming.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(traffic_ws_router)
app.include_router(monitoring_router)


@app.get("/smart-traffic/health")
def health() -> dict[str, str]:
    return {"status": "ok", "module": "smart_traffic_lite"}


@app.get("/smart-traffic/sample-video.mp4")
def sample_video() -> FileResponse:
    return FileResponse(SAMPLE_VIDEO_PATH, media_type="video/mp4", filename=SAMPLE_VIDEO_PATH.name)


@app.get("/smart-traffic/uploads/{file_name}")
def uploaded_video(file_name: str) -> FileResponse:
    target_path = (UPLOADS_DIR / file_name).resolve()

    if not target_path.is_file() or target_path.parent != UPLOADS_DIR.resolve():
        raise HTTPException(status_code=404, detail="Uploaded video not found")

    return FileResponse(target_path, media_type="video/mp4", filename=target_path.name)
