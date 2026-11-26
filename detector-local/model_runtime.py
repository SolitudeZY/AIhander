"""Reload one channel's selected model on its inference thread."""

import time

from model_paths import resolve_model_path


def file_signature(path):
    stat = path.stat()
    return (str(path.resolve()), stat.st_ino, stat.st_size,
            stat.st_mtime_ns, stat.st_ctime_ns)


class ModelRuntime:
    def __init__(self, module_name, search_dirs, factory, on_event,
                 poll_seconds=2.0, retry_seconds=30.0):
        self.module_name = module_name
        self.search_dirs = search_dirs
        self.factory = factory
        self.on_event = on_event
        self.poll_seconds = poll_seconds
        self.retry_seconds = retry_seconds
        self.runtime = None
        self.signature = None
        self.failed_signature = None
        self.retry_at = 0.0
        self.next_poll = 0.0
        self.error = ""

    def refresh(self, now=None):
        now = time.monotonic() if now is None else now
        if now < self.next_poll or not self.module_name:
            return self.runtime
        self.next_poll = now + self.poll_seconds
        candidate = None
        signature = None
        try:
            path = resolve_model_path(self.module_name, self.search_dirs)
            signature = file_signature(path)
            if signature == self.signature:
                self.error = ""
                return self.runtime
            if signature == self.failed_signature and now < self.retry_at:
                return self.runtime
            candidate = self.factory(path)
            # If replaced during initialization, retry the final file next time.
            if file_signature(path) != signature:
                raise RuntimeError("Model changed during initialization; retrying")
        except Exception as exc:
            if candidate is not None:
                candidate.release()
            if signature != self.failed_signature or now >= self.retry_at:
                self.error = str(exc)
                self.on_event("error", self.error)
                self.failed_signature = signature
                self.retry_at = now + self.retry_seconds
            return self.runtime

        previous = self.runtime
        self.runtime = candidate
        self.signature = signature
        self.failed_signature = None
        self.error = ""
        self.retry_at = 0.0
        if previous is not None:
            previous.release()
        self.on_event("info", f"Model loaded: {path}")
        return self.runtime

    def close(self):
        if self.runtime is not None:
            self.runtime.release()
            self.runtime = None
