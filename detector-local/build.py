"""Build on the target OS/architecture; source archive can be built anywhere."""

import argparse
import importlib.metadata
import json
import os
import platform
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import tempfile
import zipfile


ROOT = Path(__file__).resolve().parent
SHARED = ROOT.parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-only', action='store_true')
    args = parser.parse_args()
    output = ROOT / 'dist'
    output.mkdir(exist_ok=True)
    # Always provide a board source bundle, including shared inference helpers.
    source_files = ['detector.py', 'model_paths.py', 'model_runtime.py',
                    'requirements.txt', 'build.py', 'README.md', 'detector.service']
    archive = output / 'detector-source.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
        for name in source_files:
            bundle.write(ROOT / name, f'detector/{name}')
        for source in (ROOT / 'tests').glob('*.py'):
            bundle.write(source, f'detector/tests/{source.name}')
        for name in ['runtime_utils.py', 'infer_rknn.py']:
            source = ROOT / name if (ROOT / name).exists() else SHARED / name
            bundle.write(source, f'detector/{name}')
        bundle.writestr('detector/channels.example.json', '{}\n')
    print(archive, flush=True)
    if args.source_only:
        return
    with tempfile.TemporaryDirectory(prefix='detector-build-') as temporary:
        stage = Path(temporary)
        with zipfile.ZipFile(archive) as bundle:
            bundle.extractall(stage)
        source = stage / 'detector'
        command = [sys.executable, '-m', 'PyInstaller', '--noconfirm',
                   '--onedir', '--console', '--name', 'detector',
                   '--distpath', str(output), '--workpath', str(stage / 'work'),
                   '--specpath', str(stage), '--paths', str(source),
                   '--hidden-import', 'runtime_utils', '--hidden-import', 'infer_rknn']
        if sys.platform.startswith('linux'):
            # The board environment must already have its matching Lite2 wheel.
            # Lite2's Cython modules import ruamel dynamically; static analysis misses it.
            command += ['--collect-all', 'rknnlite', '--collect-all', 'ruamel.yaml']
            runtime_library = Path(os.environ.get('RKNN_RUNTIME_LIBRARY', '/usr/lib/librknnrt.so'))
            if not runtime_library.is_file():
                raise FileNotFoundError(f'RKNN runtime library missing: {runtime_library}')
            command += ['--add-binary', f'{runtime_library}:.']
        command.append(str(source / 'detector.py'))
        subprocess.run(command, check=True)
    for name in ['README.md', 'detector.service']:
        shutil.copy2(ROOT / name, output / 'detector' / name)
    (output / 'detector' / 'channels.example.json').write_text('{}\n', encoding='utf-8')
    if sys.platform.startswith('linux'):
        service_path = output / 'detector' / 'detector.service'
        service = service_path.read_text(encoding='utf-8')
        service = service.replace(
            'ExecStart=/home/kickpi/miniconda3/envs/rknn/bin/python /home/kickpi/testAgent/detector/detector.py',
            'ExecStart=/home/kickpi/testAgent/detector/detector')
        service_path.write_text(service, encoding='utf-8')
    versions = {}
    for package in ['numpy', 'opencv-python-headless', 'Pillow', 'websockets',
                    'rknn-toolkit-lite2', 'PyInstaller']:
        try:
            versions[package] = importlib.metadata.version(package)
        except importlib.metadata.PackageNotFoundError:
            pass
    (output / 'detector' / 'build-info.json').write_text(json.dumps({
        'system': platform.system(), 'machine': platform.machine(),
        'python': platform.python_version(), 'libc': platform.libc_ver(),
        'dependencies': versions,
    }, indent=2), encoding='utf-8')
    package_name = f'detector-{platform.system().lower()}-{platform.machine().lower()}'
    if sys.platform.startswith('linux'):
        with tarfile.open(output / f'{package_name}.tar.gz', 'w:gz') as bundle:
            bundle.add(output / 'detector', arcname='detector')
    else:
        shutil.make_archive(str(output / package_name), 'zip', output, 'detector')
    print(f'Built for {platform.system()} {platform.machine()}: {output / "detector"}')


if __name__ == '__main__':
    main()
