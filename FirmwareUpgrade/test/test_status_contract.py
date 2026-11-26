"""Test the pure status mapper without requiring RKNN, OpenCV, or a board."""
import ast
from pathlib import Path
import unittest


class StatusContractTest(unittest.TestCase):
    def test_quality_mapping(self):
        source = (Path(__file__).resolve().parents[1] / "detector" / "detector.py").read_text(encoding="utf-8")
        module = ast.parse(source)
        node = next(n for n in module.body if isinstance(n, ast.FunctionDef) and n.name == "picture_quality_status")
        namespace = {}
        exec(compile(ast.Module(body=[node], type_ignores=[]), "quality", "exec"), namespace)
        classify = namespace["picture_quality_status"]
        self.assertEqual(classify(None), "unknown")
        self.assertEqual(classify({"blur": 20}), "normal")
        self.assertEqual(classify({"blur": 80}), "blur")
        self.assertEqual(classify({"black_screen": 100, "occlusion": 100}), "black_screen")


if __name__ == "__main__":
    unittest.main()
