"""Exercise the actual source or packaged WebSocket service in an isolated directory."""

import asyncio
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import unittest

from websockets.asyncio.client import connect


ROOT = Path(__file__).resolve().parents[1]


class ServiceTest(unittest.IsolatedAsyncioTestCase):
    async def test_channel_configuration_persists_across_restart(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            with socket.socket() as listener:
                listener.bind(('127.0.0.1', 0))
                port = listener.getsockname()[1]
            environment = dict(os.environ, DETECTOR_DATA_DIR=str(root),
                               AGENT_WORK_DIR=str(root), DETECTOR_HOST='127.0.0.1',
                               DETECTOR_PORT=str(port), DETECTOR_DISABLE_INFERENCE='1',
                               DETECTOR_REQUIRE_RKNN='0')
            executable = os.environ.get('DETECTOR_TEST_BINARY')
            command = [executable] if executable else [sys.executable, str(ROOT / 'detector.py')]
            process = None
            logs = tempfile.TemporaryFile()

            async def start():
                nonlocal process
                process = subprocess.Popen(command, cwd=root, env=environment,
                                           stdout=logs, stderr=logs,
                                           creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
                for _ in range(200):
                    if process.poll() is not None:
                        logs.seek(0)
                        self.fail(logs.read().decode(errors='replace'))
                    try:
                        return await connect(f'ws://127.0.0.1:{port}', open_timeout=1)
                    except OSError:
                        await asyncio.sleep(0.1)
                self.fail('Detector did not start within 20 seconds')

            def stop():
                nonlocal process
                if process and process.poll() is None:
                    process.terminate()
                    try:
                        process.wait(timeout=10)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait(timeout=5)

            async def request(ws, cmd, values):
                values['requestId'] = cmd
                await ws.send(json.dumps({'_from': 'agent', 'cmd': cmd, 'values': values}))
                while True:
                    response = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
                    if response.get('cmd') == cmd + 'Result':
                        return response['values']

            try:
                ws = await start()
                result = await request(ws, 'channelList', {})
                self.assertEqual(result['channels'], [])
                channel = {'channelId': 'CH-test', 'name': 'test', 'moduleName': 'slide.rknn',
                           'enabled': False, 'rtspUrl': '', 'transport': 'tcp'}
                saved = await request(ws, 'channelSet', channel)
                self.assertTrue(saved['operate'])
                self.assertEqual(saved['revision'], 1)
                self.assertEqual(json.loads((root / 'channels.json').read_text())['CH-test']['moduleName'], 'slide.rknn')
                invalid = dict(channel, moduleName='../wrong.rknn')
                self.assertFalse((await request(ws, 'channelSet', invalid))['operate'])
                await ws.close()
                stop()
                ws = await start()
                listed = (await request(ws, 'channelList', {}))['channels']
                self.assertEqual(listed[0]['moduleName'], 'slide.rknn')
                self.assertEqual(listed[0]['revision'], 1)
                await ws.close()
            finally:
                stop()
                logs.close()


if __name__ == '__main__':
    unittest.main()
