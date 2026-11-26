from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from model_runtime import ModelRuntime


class Runtime:
    def __init__(self, content):
        self.content = content
        self.released = False

    def release(self):
        self.released = True


class ModelReloadTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.path = self.root / 'slide.rknn'
        self.events = []
        self.calls = []

        def factory(path):
            content = path.read_bytes()
            self.calls.append(content)
            if content == b'bad':
                raise RuntimeError('Invalid model')
            return Runtime(content)

        self.model = ModelRuntime('slide.rknn', [self.root], factory,
                                  lambda *event: self.events.append(event), poll_seconds=0)
        self.addCleanup(self.model.close)

    def replace(self, content):
        partial = self.path.with_suffix('.rknn.part')
        partial.write_bytes(content)
        partial.replace(self.path)

    def test_atomic_replacement_loads_once_and_releases_old(self):
        self.replace(b'old')
        original = self.model.refresh(0)
        self.assertIs(self.model.refresh(1), original)
        self.replace(b'new')  # Same length, different inode/file timestamps.
        updated = self.model.refresh(2)
        self.assertEqual(updated.content, b'new')
        self.assertTrue(original.released)
        self.assertFalse(updated.released)
        self.assertEqual(self.calls, [b'old', b'new'])

    def test_failed_update_preserves_old_and_retries(self):
        self.replace(b'old')
        original = self.model.refresh(0)
        self.replace(b'bad')
        self.assertIs(self.model.refresh(1), original)
        self.assertFalse(original.released)
        self.model.refresh(2)
        self.assertEqual(self.calls, [b'old', b'bad'])
        self.model.refresh(32)
        self.assertEqual(self.calls, [b'old', b'bad', b'bad'])
        self.replace(b'valid')
        self.assertEqual(self.model.refresh(33).content, b'valid')
        self.assertTrue(original.released)

    def test_waits_for_complete_download_and_ignores_other_names(self):
        (self.root / 'slide.rknn.part').write_bytes(b'downloading')
        (self.root / 'other.rknn').write_bytes(b'other')
        self.assertIsNone(self.model.refresh(0))
        self.assertEqual(self.calls, [])
        self.replace(b'complete')
        self.assertEqual(self.model.refresh(1).content, b'complete')

    def test_switches_from_legacy_to_agent_download(self):
        legacy = self.root / 'legacy'
        legacy.mkdir()
        (legacy / 'slide.rknn').write_bytes(b'legacy')
        self.model.search_dirs = [self.root, legacy]
        previous = self.model.refresh(0)
        self.replace(b'agent')
        self.assertEqual(self.model.refresh(1).content, b'agent')
        self.assertTrue(previous.released)

    def test_replacement_during_initialization_keeps_old(self):
        self.replace(b'old')
        original = self.model.refresh(0)
        self.replace(b'first')
        discarded = Runtime(b'first')

        def changing_factory(path):
            self.replace(b'second')
            return discarded

        self.model.factory = changing_factory
        self.assertIs(self.model.refresh(1), original)
        self.assertFalse(original.released)
        self.assertTrue(discarded.released)
        self.model.factory = lambda path: Runtime(path.read_bytes())
        self.assertEqual(self.model.refresh(2).content, b'second')


if __name__ == '__main__':
    unittest.main()
