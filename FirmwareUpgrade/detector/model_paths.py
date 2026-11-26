import json
import os
from pathlib import Path, PureWindowsPath


DEFAULT_ALLOWED_TARGET_DIR = "received-firmware"
DEFAULT_MODEL_SUBDIR = "opt/edge/models"


def _runtime_path(value, runtime_dir):
    path = Path(value).expanduser()
    return path if path.is_absolute() else runtime_dir / path


def _model_subdir(environ):
    raw = environ.get("DETECTOR_MODEL_SUBDIR", DEFAULT_MODEL_SUBDIR).strip()
    relative = Path(raw.lstrip("/\\"))
    windows_relative = PureWindowsPath(raw.lstrip("/\\"))
    if (
        not raw
        or relative.is_absolute()
        or ".." in relative.parts
        or ".." in windows_relative.parts
    ):
        raise ValueError("DETECTOR_MODEL_SUBDIR must be a relative directory")
    return relative


def model_search_dirs(detector_dir, environ=None):
    """Return model directories in priority order for the current deployment."""
    environ = os.environ if environ is None else environ
    detector_dir = Path(detector_dir).resolve()
    runtime_dir = _runtime_path(
        environ.get("AGENT_WORK_DIR", str(detector_dir.parent)),
        detector_dir.parent,
    ).resolve()

    explicit_dir = environ.get("DETECTOR_MODEL_DIR", "").strip()
    if explicit_dir:
        primary = _runtime_path(explicit_dir, runtime_dir).resolve()
    else:
        config_path = _runtime_path(
            environ.get(
                "AGENT_CONFIG_PATH",
                str(runtime_dir / "configs" / "agent.example.json"),
            ),
            runtime_dir,
        )
        allowed_target_dir = DEFAULT_ALLOWED_TARGET_DIR
        try:
            config = json.loads(config_path.read_text(encoding="utf-8"))
            configured = str(config.get("allowed_target_dir", "")).strip()
            if configured:
                allowed_target_dir = configured
        except (OSError, ValueError, TypeError):
            pass
        download_root = _runtime_path(allowed_target_dir, runtime_dir).resolve()
        primary = download_root / _model_subdir(environ)

    legacy = (runtime_dir / "model").resolve()
    return [primary] if primary == legacy else [primary, legacy]


def resolve_model_path(module_name, search_dirs):
    """Resolve a model filename without allowing it to escape model directories."""
    name = str(module_name or "").strip()
    if (
        not name
        or name in {".", ".."}
        or Path(name).name != name
        or PureWindowsPath(name).name != name
    ):
        raise ValueError("moduleName must contain only a model file name")

    directories = [Path(directory) for directory in search_dirs]
    if not directories:
        raise ValueError("at least one model directory is required")
    for directory in directories:
        candidate = directory / name
        if candidate.is_file():
            return candidate
    return directories[0] / name
