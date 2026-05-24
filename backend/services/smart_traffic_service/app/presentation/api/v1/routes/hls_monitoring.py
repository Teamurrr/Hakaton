from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse

from app.presentation.api.v1.schemas.traffic_dto import SmartTrafficEventDTO, TrafficStateDTO
from app.presentation.ws.traffic_events_ws import get_traffic_controller

router = APIRouter(prefix="/smart-traffic", tags=["smart-traffic"])
SERVICE_ROOT = Path(__file__).resolve().parents[5]
UPLOADS_DIR = SERVICE_ROOT / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)


@router.post("/monitoring/start")
def start_monitoring(
    stream_url: str = Query(..., description="Local video URL or filesystem path"),
) -> dict[str, str | None]:
    controller = get_traffic_controller()
    return controller.start_hls_monitoring(stream_url=stream_url)


@router.post("/monitoring/stop")
def stop_monitoring() -> dict[str, str | None]:
    controller = get_traffic_controller()
    return controller.stop_hls_monitoring()


@router.get("/monitoring/status")
def get_monitoring_status() -> dict[str, str | None]:
    controller = get_traffic_controller()
    return controller.get_hls_monitoring_status()


@router.get("/analysis/latest")
def get_latest_analysis() -> SmartTrafficEventDTO | dict[str, None]:
    controller = get_traffic_controller()
    latest_state = controller.get_latest_state()

    if latest_state is None:
        return {"event": None, "payload": None}

    return SmartTrafficEventDTO(payload=TrafficStateDTO.from_domain(latest_state))


@router.post("/video/upload")
async def upload_video(file: UploadFile = File(...)) -> dict[str, str]:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix != ".mp4":
        raise HTTPException(status_code=400, detail="Only .mp4 files are supported")

    safe_stem = Path(file.filename or "traffic-video").stem
    safe_stem = "".join(char if char.isalnum() or char in {"-", "_"} else "-" for char in safe_stem).strip("-_")
    if not safe_stem:
        safe_stem = "traffic-video"

    stored_name = f"{safe_stem}-{uuid4().hex[:8]}{suffix}"
    target_path = UPLOADS_DIR / stored_name
    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    target_path.write_bytes(file_bytes)
    return {
        "file_name": stored_name,
        "video_url": f"/smart-traffic/uploads/{stored_name}",
        "stream_url": str(target_path.resolve()),
    }


@router.get("/video/processed.mjpg")
def stream_processed_video() -> StreamingResponse:
    controller = get_traffic_controller()
    return StreamingResponse(
        controller.iter_processed_mjpeg_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )
