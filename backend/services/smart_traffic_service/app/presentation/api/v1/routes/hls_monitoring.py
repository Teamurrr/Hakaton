from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from Hakaton.backend.services.smart_traffic_service.app.presentation.ws.traffic_events_ws import get_traffic_controller

router = APIRouter(prefix="/smart-traffic", tags=["smart-traffic"])


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


@router.get("/video/processed.mjpg")
def stream_processed_video() -> StreamingResponse:
    controller = get_traffic_controller()
    return StreamingResponse(
        controller.iter_processed_mjpeg_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )
