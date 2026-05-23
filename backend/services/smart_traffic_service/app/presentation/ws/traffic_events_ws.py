from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.application.controllers.traffic_controller import TrafficController
from app.application.services.decision_maker import DecisionMaker
from app.infrastructure.yolo.yolo_detector_adapter import YoloDetectorAdapter
from app.presentation.api.v1.schemas.traffic_dto import SmartTrafficEventDTO, TrafficStateDTO

router = APIRouter(prefix="/smart-traffic", tags=["smart-traffic"])


def build_traffic_controller() -> TrafficController:
    # Connect your production detector, tracker, repository, or message broker here.
    detector = YoloDetectorAdapter(model_path="yolov8n.pt", confidence_threshold=0.35)
    decision_maker = DecisionMaker()
    return TrafficController(detector=detector, decision_maker=decision_maker)


_traffic_controller: TrafficController | None = None


def get_traffic_controller() -> TrafficController:
    global _traffic_controller

    if _traffic_controller is None:
        _traffic_controller = build_traffic_controller()

    return _traffic_controller


@router.websocket("/ws/events")
async def stream_traffic_state(
    websocket: WebSocket,
    video_path: str = Query("Road traffic video for object recognition.mp4"),
) -> None:
    await websocket.accept()
    controller = get_traffic_controller()

    try:
        async for state in controller.process_video_stream(video_path):
            event = SmartTrafficEventDTO(payload=TrafficStateDTO.from_domain(state))
            await websocket.send_json(event.model_dump(mode="json"))
    except WebSocketDisconnect:
        return
