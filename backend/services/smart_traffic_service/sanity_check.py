from __future__ import annotations

import argparse
import importlib.util
import sys
from pathlib import Path


SERVICE_ROOT = Path(__file__).resolve().parent
DEFAULT_MODEL_PATH = SERVICE_ROOT / "yolov8n.pt"
DEFAULT_VIDEO_PATH = SERVICE_ROOT / "Road traffic video for object recognition.mp4"


def resolve_path(value: str) -> Path:
    path = Path(value).expanduser()
    if path.is_absolute():
        return path

    return (SERVICE_ROOT / path).resolve()


def check_ultralytics() -> None:
    if importlib.util.find_spec("ultralytics") is None:
        raise ImportError(
            "ultralytics is not installed. Install backend/services/smart_traffic_service/requirements.txt before starting the backend."
        )

    import ultralytics

    version = getattr(ultralytics, "__version__", "unknown")
    print(f"[OK] ultralytics {version}")


def check_file(path: Path, label: str) -> None:
    if not path.exists():
        raise FileNotFoundError(f"{label} not found: {path}")

    if not path.is_file():
        raise FileNotFoundError(f"{label} is not a file: {path}")

    print(f"[OK] {label}: {path}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Check the smart-traffic YOLO runtime environment.")
    parser.add_argument(
        "--model-path",
        default=str(DEFAULT_MODEL_PATH),
        help="Path to the YOLO weights file. Defaults to the bundled yolov8n.pt.",
    )
    parser.add_argument(
        "--video-path",
        default=str(DEFAULT_VIDEO_PATH),
        help="Path to a real test video file that the backend should be able to read. Defaults to the bundled sample video.",
    )
    args = parser.parse_args()

    try:
        check_ultralytics()
        check_file(resolve_path(args.model_path), "YOLO weights")
        check_file(resolve_path(args.video_path), "test video")
    except (FileNotFoundError, ImportError) as exc:
        print(f"[FAIL] {exc}", file=sys.stderr)
        return 1

    print("[OK] Smart-traffic environment is ready")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())