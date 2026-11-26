import json
from pathlib import Path
import sys
import tempfile
import unittest


DETECTOR_DIR = Path(__file__).resolve().parents[1] / "detector"
sys.path.insert(0, str(DETECTOR_DIR))

from model_paths import model_search_dirs, resolve_model_path


class DetectorModelPathsTest(unittest.TestCase):
    def test_uses_agent_download_directory(self):
        with tempfile.TemporaryDirectory() as directory:
            runtime_dir = Path(directory)
            detector_dir = runtime_dir / "detector"
            config_path = runtime_dir / "configs" / "agent.example.json"
            config_path.parent.mkdir()
            config_path.write_text(
                json.dumps({"allowed_target_dir": "./received-firmware"}),
                encoding="utf-8",
            )

            directories = model_search_dirs(
                detector_dir,
                {"AGENT_CONFIG_PATH": str(config_path)},
            )

            self.assertEqual(
                directories[0],
                runtime_dir / "received-firmware" / "opt" / "edge" / "models",
            )
            self.assertEqual(directories[1], runtime_dir / "model")

    def test_environment_can_override_model_directory(self):
        with tempfile.TemporaryDirectory() as directory:
            runtime_dir = Path(directory)
            model_dir = runtime_dir / "custom-models"

            directories = model_search_dirs(
                runtime_dir / "detector",
                {"DETECTOR_MODEL_DIR": str(model_dir)},
            )

            self.assertEqual(directories[0], model_dir)

    def test_resolves_downloaded_model_before_legacy_model(self):
        with tempfile.TemporaryDirectory() as directory:
            runtime_dir = Path(directory)
            downloaded = runtime_dir / "received-firmware" / "opt" / "edge" / "models"
            legacy = runtime_dir / "model"
            downloaded.mkdir(parents=True)
            legacy.mkdir()
            (downloaded / "landslide.rknn").write_bytes(b"new")
            (legacy / "landslide.rknn").write_bytes(b"old")

            resolved = resolve_model_path("landslide.rknn", [downloaded, legacy])

            self.assertEqual(resolved, downloaded / "landslide.rknn")

    def test_rejects_module_name_with_a_path(self):
        with tempfile.TemporaryDirectory() as directory:
            model_dir = Path(directory)
            for module_name in ("../secret.rknn", "/tmp/secret.rknn", r"..\secret.rknn"):
                with self.subTest(module_name=module_name):
                    with self.assertRaises(ValueError):
                        resolve_model_path(module_name, [model_dir])


if __name__ == "__main__":
    unittest.main()
