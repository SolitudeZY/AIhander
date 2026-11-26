"""Opt-in board verification: binary, real model, isolated channel and atomic reload."""

import argparse
import json
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import tempfile
import time


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('binary', type=Path)
    parser.add_argument('model', type=Path)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    binary = args.binary.resolve()
    model = args.model.resolve()
    report = {'binary': str(binary), 'model': model.name}
    with tempfile.TemporaryDirectory(prefix='detector-binary-verify-') as directory:
        data = Path(directory)
        models = data / 'models'
        models.mkdir()
        target = models / model.name
        shutil.copyfile(model, target)
        environment = dict(os.environ, PATH='/usr/bin:/bin', DETECTOR_REQUIRE_RKNN='1',
                           DETECTOR_DATA_DIR=str(data), DETECTOR_MODEL_DIR=str(models),
                           DETECTOR_HOST='127.0.0.1', DETECTOR_DISABLE_INFERENCE='0')
        for key in ['PYTHONPATH', 'PYTHONHOME', 'LD_LIBRARY_PATH', 'CONDA_PREFIX', 'CONDA_DEFAULT_ENV']:
            environment.pop(key, None)

        def run(*arguments):
            result = subprocess.run([str(binary), *arguments], cwd=data, env=environment,
                                    capture_output=True, text=True, timeout=60)
            print(result.stdout, result.stderr, flush=True)
            if result.returncode:
                raise RuntimeError(f'Executable failed: {arguments}, code={result.returncode}')
            return result.stdout

        def last_json(output):
            return next(json.loads(line) for line in reversed(output.splitlines()) if line.startswith('{'))

        report['check'] = last_json(run('--check'))
        assert report['check']['rknnAvailable'] is True
        report['inference'] = last_json(run('--check-model', str(target)))
        (data / 'channels.json').write_text(json.dumps({'CH-package': {
            'channelId': 'CH-package', 'name': 'package verification', 'enabled': True,
            'rtspUrl': '', 'moduleName': model.name, 'revision': 1,
        }}))
        with socket.socket() as listener:
            listener.bind(('127.0.0.1', 0))
            environment['DETECTOR_PORT'] = str(listener.getsockname()[1])
        with (data / 'console.log').open('w+') as console:
            process = subprocess.Popen([str(binary)], cwd=data, env=environment,
                                       stdout=console, stderr=console)

            def load_count():
                path = data / 'logs/logInfo.log'
                return path.read_text().count('Model loaded:') if path.exists() else 0

            def wait_load(expected):
                deadline = time.monotonic() + 30
                while time.monotonic() < deadline:
                    if process.poll() is not None:
                        raise RuntimeError(f'Service exited with code {process.returncode}')
                    if load_count() >= expected:
                        return
                    time.sleep(0.25)
                raise TimeoutError(f'Model load count did not reach {expected}')

            try:
                wait_load(1)
                partial = target.with_suffix('.rknn.part')
                shutil.copyfile(model, partial)
                time.sleep(3)
                assert load_count() == 1, 'Incomplete .part triggered a reload'
                os.replace(partial, target)
                wait_load(2)
                events = (data / 'logs/logInfo.log').read_text()
                assert 'E_MODEL_RELOAD' not in events, events
                report['atomicReload'] = True
                report['partialFileIgnored'] = True
            finally:
                process.send_signal(signal.SIGINT)
                try:
                    report['serviceExitCode'] = process.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=5)
                    raise
                console.seek(0)
                print(console.read(), flush=True)
            assert report['serviceExitCode'] == 0, report
    args.report.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
