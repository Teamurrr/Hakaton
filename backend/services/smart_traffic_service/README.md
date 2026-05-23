# SmartTrafficLite backend

Isolated FastAPI service for simulated traffic-stream analysis.

Run from this directory:

```bash
uvicorn app.main:app --reload
```

WebSocket endpoint:

```text
ws://localhost:8000/smart-traffic/ws/events?video_path=path/to/video.mp4
```

`YoloDetectorAdapter` now fails fast instead of falling back to mock detections.
It raises `FileNotFoundError` when the video file or YOLO weights are missing,
and `ImportError` when `ultralytics` is not installed.

Before starting the backend, run the sanity check:

```bash
python sanity_check.py
```

The script verifies:

- `ultralytics` is installed
- `yolov8n.pt` exists and is readable
- `Road traffic video for object recognition.mp4` exists and is readable

If you want to check a different file, pass `--video-path path/to/video.mp4`.
