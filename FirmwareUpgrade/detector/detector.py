import asyncio
import websockets
import json
import os
import sys
import time
import base64
import random
os.environ.setdefault("OPENCV_FFMPEG_LOGLEVEL", "-8")
import cv2
import numpy as np
from datetime import datetime, timezone, timedelta
import io
import threading
from pathlib import Path
from PIL import Image
import logging
import glob
import re
import queue
from collections import deque
from urllib.parse import urlsplit, urlunsplit
from model_paths import model_search_dirs, resolve_model_path
from model_runtime import ModelRuntime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

BASE_DIR = os.path.dirname(os.path.abspath(sys.executable if getattr(sys, 'frozen', False) else __file__))
PARENT_DIR = os.path.dirname(BASE_DIR)
sys.path.append(PARENT_DIR)
# Source checkout keeps these shared helpers two directories above detector-local.
sys.path.append(str(Path(BASE_DIR).parents[1]))
DATA_DIR = os.path.abspath(os.environ.get('DETECTOR_DATA_DIR', BASE_DIR))
os.makedirs(DATA_DIR, exist_ok=True)
MODEL_SEARCH_DIRS = model_search_dirs(BASE_DIR)

try:
    if os.environ.get('DETECTOR_DISABLE_INFERENCE') == '1':
        raise ImportError('Inference disabled by configuration')
    from rknnlite.api import RKNNLite
    from runtime_utils import create_runtime
    from infer_rknn import infer_frame, draw_detections
    RKNN_AVAILABLE = True
except ImportError:
    RKNN_AVAILABLE = False
    logging.warning("RKNN modules not available. Inference will be disabled.")
if not RKNN_AVAILABLE and os.environ.get('DETECTOR_REQUIRE_RKNN') == '1':
    raise RuntimeError('RKNN is required in production; check rknn-toolkit-lite2 and runtime helpers')

CHANNELS_FILE = os.path.join(DATA_DIR, 'channels.json')
DEVICE_ID = os.environ.get('DEVICE_ID', '').strip() or 'unknown-device'
LOG_DIR = os.path.join(DATA_DIR, 'logs')
os.makedirs(LOG_DIR, exist_ok=True)
TEXT_LOG_FILE = os.path.join(LOG_DIR, 'logInfo.log')
LOG_MAX_BYTES = 20 * 1024 * 1024
LOG_LOCK = threading.Lock()

def redact_sensitive(value):
    """Remove credentials/tokens before values reach console or persisted logs."""
    text = str(value or '')
    try:
        parsed = urlsplit(text)
        if parsed.scheme and parsed.hostname:
            host = parsed.hostname
            if parsed.port:
                host = f"{host}:{parsed.port}"
            return urlunsplit((parsed.scheme, host, parsed.path, parsed.query, ''))
    except Exception:
        pass
    for key in ('password', 'passwd', 'token', 'secret', 'authorization'):
        text = __import__('re').sub(rf'({key})=[^&\s]+', r'\1=***', text, flags=__import__('re').I)
    return text

def write_event(level, service, stage, message, channel_id=None, model_version=None, error_code=None):
    normalized_level = {'warning': 'warn', 'error': 'err'}.get(str(level).lower(), str(level).lower())
    event = {
        'time': datetime.now(timezone(timedelta(hours=8))).isoformat('T', 'seconds'),
        'level': normalized_level,
        'service': service,
        'deviceId': DEVICE_ID,
        'stage': stage,
        'message': redact_sensitive(message)[:16384],
    }
    if channel_id:
        event['channelId'] = channel_id
    if model_version:
        event['modelVersion'] = model_version
    if error_code:
        event['errorCode'] = error_code
    try:
        with LOG_LOCK:
            text_time = datetime.now(timezone(timedelta(hours=8))).strftime('%Y-%m-%d %H:%M:%S')
            metadata = [f'service={service}', f'deviceId={DEVICE_ID}', f'stage={stage}']
            if channel_id:
                metadata.append(f'channelId={channel_id}')
            if model_version:
                metadata.append(f'modelVersion={redact_sensitive(model_version)}')
            if error_code:
                metadata.append(f'errorCode={error_code}')
            text_line = (
                f"{text_time}  [{normalized_level}]  [detector.py]  "
                f"{event['message']} | {' '.join(metadata)}\n"
            ).encode('utf-8')
            text_size = os.path.getsize(TEXT_LOG_FILE) if os.path.exists(TEXT_LOG_FILE) else 0
            if text_size and text_size + len(text_line) > LOG_MAX_BYTES:
                stamp = datetime.now(timezone(timedelta(hours=8))).strftime('%Y%m%d-%H%M%S')
                archived_text = os.path.join(LOG_DIR, f'logInfo-{stamp}-{int(time.time() * 1000) % 1000:03d}.log')
                os.replace(TEXT_LOG_FILE, archived_text)
            with open(TEXT_LOG_FILE, 'ab') as stream:
                stream.write(text_line)
    except OSError:
        pass

def read_events(limit=200, level=None, service=None, channel_id=None):
    text_files = sorted(glob.glob(os.path.join(LOG_DIR, 'logInfo*.log')), key=os.path.getmtime)
    if not text_files:
        return []
    try:
        limit = max(1, min(int(limit), 1000))
    except (TypeError, ValueError):
        limit = 200
    events = deque(maxlen=limit)
    level = {'warning': 'warn', 'error': 'err'}.get(level, level)
    pattern = re.compile(r'^(\S+\s+\S+)\s+\[(info|warn|err)\]\s+\[([^]]+)\]\s+(.*)$')
    for text_file in text_files:
        try:
            with open(text_file, 'r', encoding='utf-8') as stream:
                for line in stream:
                    match = pattern.match(line.strip())
                    if not match:
                        continue
                    timestamp, item_level, source, raw_message = match.groups()
                    message, separator, metadata_text = raw_message.partition(' | ')
                    metadata = dict(re.findall(r'(\w+)=([^\s]+)', metadata_text)) if separator else {}
                    inferred_service = 'cloud-agent' if 'registration' in message else 'edge-manager'
                    event = {
                        'time': timestamp.replace(' ', 'T'),
                        'level': item_level,
                        'service': metadata.get('service', inferred_service),
                        'deviceId': metadata.get('deviceId', DEVICE_ID),
                        'stage': metadata.get('stage', 'runtime'),
                        'message': message,
                        'sourceFile': source,
                    }
                    for key in ('channelId', 'modelVersion', 'errorCode'):
                        if metadata.get(key):
                            event[key] = metadata[key]
                    if level and event['level'] != level:
                        continue
                    if service and event['service'] != service:
                        continue
                    if channel_id and event.get('channelId') != channel_id:
                        continue
                    events.append(event)
        except OSError:
            continue
    return list(reversed(events))

def calculate_picture_metrics(frame):
    if frame is None:
        return {"black_screen": 0.0, "occlusion": 0.0, "blur": 0.0, "brightness_abnormal": 0.0}
    try:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        mean_val = np.mean(gray)
        std_val = np.std(gray)
        blur_val = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # 黑屏 (0-100)：灰度均值越接近 0 越黑
        black_screen = max(0.0, 100.0 - mean_val * 2) if mean_val < 50 else 0.0
        
        # 亮度异常 (0-100)：均值太低或太高
        if mean_val < 40:
            brightness_abnormal = (40.0 - mean_val) * 2.5
        elif mean_val > 215:
            brightness_abnormal = (mean_val - 215.0) * 2.5
        else:
            brightness_abnormal = 0.0
            
        # 严重模糊 (0-100)：拉普拉斯方差小于 100 通常意味着画面非常模糊
        blur = max(0.0, 100.0 - blur_val) if blur_val < 100 else 0.0
        
        # 严重遮挡 (0-100)：标准差非常低意味着画面极其单调（例如被纯色物体完全遮挡）
        occlusion = max(0.0, 100.0 - std_val * 2) if std_val < 50 else 0.0
        
        return {
            "black_screen": round(min(100.0, float(black_screen)), 1),
            "occlusion": round(min(100.0, float(occlusion)), 1),
            "blur": round(min(100.0, float(blur)), 1),
            "brightness_abnormal": round(min(100.0, float(brightness_abnormal)), 1)
        }
    except Exception as e:
        logging.error(f"Error calculating metrics: {e}")
        return {"black_screen": 0.0, "occlusion": 0.0, "blur": 0.0, "brightness_abnormal": 0.0}

class StreamReader(threading.Thread):
    def __init__(self, cap):
        super().__init__(daemon=True)
        self.cap = cap
        self.latest_frame = None
        self.ret = True
        self.running = True
        self.frame_count = 0
        self.start_time = time.time()
        self.current_fps = 0.0
        
    def run(self):
        # 独立线程：以最快速度从底层 FFmpeg 缓冲区抽帧，防止旧帧堆积
        while self.running:
            ret, frame = self.cap.read()
            self.ret = ret
            if ret and frame is not None:
                self.latest_frame = frame
                self.frame_count += 1
                now = time.time()
                if now - self.start_time >= 1.0:
                    self.current_fps = self.frame_count / (now - self.start_time)
                    self.frame_count = 0
                    self.start_time = now
            else:
                break
                
    def stop(self):
        self.running = False

class ChannelWorker(threading.Thread):
    def __init__(self, channel_id, rtsp_url, module_name, alarm_queue, is_test=False):
        super().__init__(daemon=True)
        self.channel_id = channel_id
        self.rtsp_url = rtsp_url
        self.module_name = module_name
        self.alarm_queue = alarm_queue
        self.is_test = is_test
        
        self.running = True
        self.status = "offline"
        self.err_msg = "Initializing..."
        self.latest_frame = None
        self.input_fps = 0.0
        
        self.runtime = None
        self.stop_event = threading.Event()
        self.model_runtime = ModelRuntime(
            module_name, MODEL_SEARCH_DIRS,
            lambda path: create_runtime(path, core_mode="auto", verbose=False),
            lambda level, message: write_event(
                level, 'model-runtime', 'model.load', message,
                self.channel_id, self.module_name,
                'E_MODEL_RELOAD' if level == 'error' else None),
        )

    def refresh_model(self):
        if RKNN_AVAILABLE:
            self.runtime = self.model_runtime.refresh()

    def wait_retry(self, seconds):
        # Continue watching downloads while the camera is disconnected.
        deadline = time.monotonic() + seconds
        while self.running and time.monotonic() < deadline:
            self.refresh_model()
            self.stop_event.wait(min(1.0, max(0.0, deadline - time.monotonic())))

    def run(self):
        try:
            self.run_channel()
        finally:
            self.model_runtime.close()

    def run_channel(self):
        write_event('info', 'video-service', 'stream.start', '通道工作线程启动', self.channel_id)
        self.refresh_model()

        retry_delay = 5
        max_retry_delay = 60
        
        while self.running:
            self.refresh_model()
            if not self.rtsp_url:
                self.err_msg = "No RTSP URL configured"
                self.status = "offline"
                self.wait_retry(2)
                continue

            # 如果开启了 is_test，在交给 OpenCV/FFmpeg 之前先做一次 TCP 连接预检，防止底层刷屏报错
            if self.is_test:
                try:
                    import urllib.parse, socket
                    parsed = urllib.parse.urlparse(self.rtsp_url)
                    host = parsed.hostname
                    port = parsed.port if parsed.port else 554
                    with socket.create_connection((host, port), timeout=2):
                        pass # TCP connection succeeded
                except Exception as e:
                    self.err_msg = f"Test stream unreachable: {e}"
                    self.status = "offline"
                    # 不用 warning 级别打印，静默重试即可，防止测试流刷屏
                    self.wait_retry(retry_delay)
                    retry_delay = min(retry_delay * 2, max_retry_delay)
                    continue

            # 使用 cv2.VideoCapture 前先记录尝试拉流
            logging.info(f"[{self.channel_id}] Attempting to open RTSP stream")
            write_event('info', 'video-service', 'stream.connect', '开始拉流', self.channel_id)
            
            # 为了减少 H.265 (HEVC) 丢帧或 UDP 丢包导致的 Could not find ref with POC 错误
            # 强制让 OpenCV 底层的 FFmpeg 使用 TCP 传输 RTSP
            os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
            cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
            
            if not cap.isOpened():
                self.err_msg = "Failed to open RTSP stream"
                self.status = "offline"
                logging.warning(f"[{self.channel_id}] Failed to open RTSP stream. Retrying in {retry_delay} seconds...")
                write_event('warning', 'video-service', 'stream.connect', '拉流失败，准备重连', self.channel_id, error_code='E_STREAM_OPEN')
                cap.release()
                self.wait_retry(retry_delay)
                # 指数退避，最高到 max_retry_delay
                retry_delay = min(retry_delay * 2, max_retry_delay)
                continue
                
            # 拉流成功，重置退避时间
            retry_delay = 5
            self.status = "running"
            self.err_msg = ""
            frame_count = 0
            start_time = time.time()
            last_alarm_time = 0
            logging.info(f"[{self.channel_id}] Successfully opened RTSP stream.")
            write_event('info', 'video-service', 'stream.connected', '拉流连接成功', self.channel_id)
            
            reader = StreamReader(cap)
            reader.start()
            
            while self.running and reader.ret:
                self.refresh_model()
                self.input_fps = reader.current_fps  # 直接读取 reader 线程的拉流 FPS
                
                if reader.latest_frame is None:
                    time.sleep(0.01)
                    continue
                    
                frame = reader.latest_frame.copy()
                self.latest_frame = frame
                now = time.time()
                    
                if self.runtime:
                    try:
                        # 640 input_size, 0.75 conf_threshold, 0.6 iou_threshold
                        result = infer_frame(self.runtime, frame, 640, 0.75, 0.6)
                        if len(result.boxes) > 0 and now - last_alarm_time > 60.0:
                            last_alarm_time = now
                            max_conf = float(np.max(result.scores))
                            drawn_frame = draw_detections(frame, result.boxes, result.scores, result.classes, ["landslide"])
                            self.alarm_queue.put_nowait({
                                "channelId": self.channel_id,
                                "confidence": max_conf,
                                "frame": drawn_frame
                            })
                            logging.info(f"[{self.channel_id}] Alarm detected! Confidence: {max_conf:.2f}")
                            write_event('info', 'vision-guard', 'detection.result', f'检测到滑坡，置信度 {max_conf:.2f}', self.channel_id)
                    except Exception as e:
                        logging.error(f"[{self.channel_id}] Inference error: {e}")
                        write_event('error', 'model-runtime', 'inference', f'推理异常: {e}', self.channel_id, self.module_name, 'E_INFERENCE')
                        time.sleep(1)
                        
                # 控制推理帧率，防止 CPU/NPU 100% 满载，并给 reader 线程留出 CPU 时间片
                time.sleep(0.03)
                
            reader.stop()
            reader.join(timeout=1.0)
            
            if not reader.ret:
                self.err_msg = "Stream disconnected or read failed"
                self.status = "offline"
                self.input_fps = 0.0
                write_event('warning', 'video-service', 'stream.disconnected', '视频流断开或读取失败', self.channel_id, error_code='E_STREAM_DISCONNECTED')
                
            cap.release()
            
    def stop(self):
        self.running = False
        self.stop_event.set()


class DetectorServer:
    def __init__(self):
        self.channels = {}
        self.clients = set()
        self.workers = {}  # channelId -> ChannelWorker
        # Producers run in ChannelWorker threads; asyncio.Queue is not thread safe.
        self.alarm_queue = queue.Queue()
        self.load_channels()
        
    def start_worker(self, ch_id, ch_config):
        if not ch_config.get('enabled', False):
            return
        if ch_id in self.workers:
            self.workers[ch_id].stop()
            
        worker = ChannelWorker(
            channel_id=ch_id,
            rtsp_url=ch_config.get('rtspUrl', ''),
            module_name=ch_config.get('moduleName', ''),
            alarm_queue=self.alarm_queue,
            is_test=ch_config.get('isTest', False)
        )
        worker.start()
        self.workers[ch_id] = worker
        
    def stop_worker(self, ch_id):
        if ch_id in self.workers:
            self.workers[ch_id].stop()
            del self.workers[ch_id]

    def load_channels(self):
        if os.path.exists(CHANNELS_FILE):
            try:
                with open(CHANNELS_FILE, 'r', encoding='utf-8') as f:
                    self.channels = json.load(f)
                    for ch_id, ch_config in self.channels.items():
                        self.start_worker(ch_id, ch_config)
            except Exception as e:
                logging.error(f"Failed to load channels: {e}")
        else:
            self.channels = {}
            
    def save_channels(self):
        temporary = CHANNELS_FILE + '.tmp'
        with open(temporary, 'w', encoding='utf-8') as f:
            json.dump(self.channels, f, ensure_ascii=False, indent=2)
        os.replace(temporary, CHANNELS_FILE)

    def get_rfc3339_time(self):
        # 兼容 Go 的 RFC3339 格式，强制使用东八区 (UTC+8)
        # 如果板子的系统时区没设置对，astimezone() 可能取不到东八区，所以这里硬编码时区差
        tz_utc_8 = timezone(timedelta(hours=8))
        return datetime.now(tz_utc_8).isoformat('T', 'seconds')

    async def handle_log_list(self, websocket, req_id, values):
        logs = read_events(
            limit=values.get('limit', 200),
            level=values.get('level') or None,
            service=values.get('service') or None,
            channel_id=values.get('channelId') or None,
        )
        await self.send_json(websocket, {
            '_from': 'detector',
            'cmd': 'logListResult',
            'time': self.get_rfc3339_time(),
            'values': {'requestId': req_id, 'operate': True, 'logs': logs},
        })

    def compress_image_to_base64(self, img_path):
        pass

    def capture_frame_to_base64(self, rtsp_url):
        pass

    async def handle_client(self, websocket):
        self.clients.add(websocket)
        logging.info(f"New client connected: {websocket.remote_address}")
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    _from = data.get('_from')
                    cmd = data.get('cmd')
                    values = data.get('values', {})
                    req_id = values.get('requestId')
                    
                    if _from != 'agent':
                        continue
                        
                    if cmd == 'channelList':
                        await self.handle_channel_list(websocket, req_id)
                    elif cmd == 'channelSet':
                        await self.handle_channel_set(websocket, req_id, values)
                    elif cmd == 'channelDelete':
                        await self.handle_channel_delete(websocket, req_id, values)
                    elif cmd == 'logList':
                        await self.handle_log_list(websocket, req_id, values)
                        
                except json.JSONDecodeError:
                    logging.warning("Received invalid JSON")
                except Exception as e:
                    logging.error(f"Error handling message: {e}")
        except websockets.exceptions.ConnectionClosed:
            logging.info(f"Client disconnected: {websocket.remote_address}")
        finally:
            self.clients.remove(websocket)

    async def send_json(self, websocket, payload):
        try:
            await websocket.send(json.dumps(payload))
        except websockets.exceptions.ConnectionClosed:
            pass

    async def handle_channel_list(self, websocket, req_id):
        logging.info(f"[Recv] channelList. RequestId: {req_id}")
        channels_list = list(self.channels.values())
        payload = {
            "_from": "detector",
            "cmd": "channelListResult",
            "time": self.get_rfc3339_time(),
            "values": {
                "requestId": req_id,
                "operate": True,
                "channels": channels_list
            }
        }
        await self.send_json(websocket, payload)

    async def handle_channel_set(self, websocket, req_id, values):
        channel_id = values.get('channelId')
        logging.info(f"[Recv] channelSet. ChannelId: {channel_id}, RequestId: {req_id}")
        if not channel_id:
            payload = {
                "_from": "detector",
                "cmd": "channelSetResult",
                "time": self.get_rfc3339_time(),
                "values": {
                    "requestId": req_id,
                    "operate": False,
                    "err": "Missing channelId"
                }
            }
            await self.send_json(websocket, payload)
            return

        try:
            if values.get('moduleName'):
                resolve_model_path(values['moduleName'], MODEL_SEARCH_DIRS)
        except ValueError as exc:
            await self.send_json(websocket, {
                '_from': 'detector', 'cmd': 'channelSetResult',
                'time': self.get_rfc3339_time(),
                'values': {'requestId': req_id, 'operate': False, 'err': str(exc)},
            })
            return

        # 更新或新增
        existing = self.channels.get(channel_id, {})
        revision = existing.get('revision', 0) + 1
        
        new_channel = {
            "channelId": channel_id,
            "name": values.get('name', ''),
            "enabled": values.get('enabled', False),
            "rtspUrl": values.get('rtspUrl', ''),
            "transport": values.get('transport', 'tcp'),
            "moduleName": values.get('moduleName', ''),
            "revision": revision,
            "isTest": values.get('isTest', False)
        }
        self.channels[channel_id] = new_channel
        self.save_channels()
        write_event('info', 'edge-manager', 'config.load', '通道配置已保存', channel_id, new_channel.get('moduleName') or None)
        
        # 停止旧 worker，如果 enabled，启动新 worker
        self.stop_worker(channel_id)
        if new_channel.get('enabled', False):
            self.start_worker(channel_id, new_channel)
        
        payload = {
            "_from": "detector",
            "cmd": "channelSetResult",
            "time": self.get_rfc3339_time(),
            "values": {
                "requestId": req_id,
                "operate": True,
                "channel": new_channel,
                "revision": revision,
                "status": "stopped"
            }
        }
        await self.send_json(websocket, payload)
        # 根据文档 1.5，收到 channelSet 后立即触发一轮广播
        await self.broadcast_status()

    async def handle_channel_delete(self, websocket, req_id, values):
        channel_id = values.get('channelId')
        logging.info(f"[Recv] channelDelete. ChannelId: {channel_id}, RequestId: {req_id}")
        if channel_id in self.channels:
            del self.channels[channel_id]
            self.save_channels()
            self.stop_worker(channel_id)
            write_event('info', 'edge-manager', 'config.delete', '通道配置已删除', channel_id)
            
        payload = {
            "_from": "detector",
            "cmd": "channelDeleteResult",
            "time": self.get_rfc3339_time(),
            "values": {
                "requestId": req_id,
                "operate": True,
                "channelId": channel_id
            }
        }
        await self.send_json(websocket, payload)
        # 收到 channelDelete 后也立即触发一轮广播
        await self.broadcast_status()

    async def broadcast_status(self):
        if not self.clients:
            return
            
        for ch_id, ch in self.channels.items():
            worker = self.workers.get(ch_id)
            if worker:
                status = worker.status
                input_fps = worker.input_fps
                err_msg = worker.err_msg
                img_b64 = ""
                if worker.latest_frame is not None and status == "running":
                    # encode frame
                    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 60]
                    success, encoded_image = cv2.imencode('.jpg', worker.latest_frame, encode_param)
                    if success:
                        img_b64 = base64.b64encode(encoded_image).decode('utf-8')
            else:
                status = "stopped"
                input_fps = 0.0
                err_msg = ""
                img_b64 = ""

            payload = {
                "_from": "detector",
                "cmd": "channelStatusChanged",
                "time": self.get_rfc3339_time(),
                "values": {
                    "operate": True,
                    "channelId": ch_id,
                    "revision": ch.get('revision', 1),
                    "status": status,
                    "inputFps": round(input_fps, 1),
                    "observedAt": self.get_rfc3339_time()
                }
            }
            
            # 若拉流成功（有图）
            if img_b64:
                payload["values"]["snapshot"] = img_b64
                payload["values"]["snapshotMimeType"] = "image/jpeg"
                # 使用真实的图像质量计算
                payload["values"]["pictureMetrics"] = calculate_picture_metrics(worker.latest_frame)
            elif err_msg:
                payload["values"]["err"] = err_msg
            
            # 广播给所有客户端
            tasks = [self.send_json(client, payload) for client in self.clients]
            if tasks:
                await asyncio.gather(*tasks)

    async def status_task(self):
        while True:
            await asyncio.sleep(10)
            await self.broadcast_status()

    async def alarm_task(self):
        while True:
            try:
                # 阻塞获取队列中的告警消息
                try:
                    alarm_info = self.alarm_queue.get_nowait()
                except queue.Empty:
                    await asyncio.sleep(0.1)
                    continue
                if not self.clients:
                    continue
                
                ch_id = alarm_info["channelId"]
                confidence = alarm_info["confidence"]
                frame = alarm_info["frame"]
                
                # encode
                img_b64 = ""
                encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 60]
                success, encoded_image = cv2.imencode('.jpg', frame, encode_param)
                if success:
                    img_b64 = base64.b64encode(encoded_image).decode('utf-8')
                
                payload = {
                    "_from": "detector",
                    "cmd": "alarmDetected",
                    "time": self.get_rfc3339_time(),
                    "values": {
                        "channelId": ch_id,
                        "detectionType": "landslide",
                        "confidence": confidence,
                        "alarmTime": self.get_rfc3339_time(),
                        "image": img_b64,
                        "imageMimeType": "image/jpeg"
                    }
                }
                
                # 广播给所有客户端
                tasks = [self.send_json(client, payload) for client in self.clients]
                if tasks:
                    await asyncio.gather(*tasks)
            except Exception as e:
                logging.error(f"Error processing alarm queue: {e}")
                await asyncio.sleep(1)

    async def run(self):
        write_event('info', 'edge-manager', 'service.start', 'detector 服务启动')
        # 启动定时任务
        tasks = [asyncio.create_task(self.status_task()), asyncio.create_task(self.alarm_task())]
        
        # 启动 WebSocket 服务端
        host = os.environ.get('DETECTOR_HOST', '0.0.0.0')
        port = int(os.environ.get('DETECTOR_PORT', '8090'))
        try:
            async with websockets.serve(self.handle_client, host, port):
                logging.info("Detector WebSocket server listening on %s:%s; models=%s; inference=%s",
                             host, port, MODEL_SEARCH_DIRS, RKNN_AVAILABLE)
                await asyncio.Future()
        finally:
            for task in tasks:
                task.cancel()
            for worker in self.workers.values():
                worker.stop()
            await asyncio.gather(*tasks, return_exceptions=True)
            for worker in self.workers.values():
                await asyncio.to_thread(worker.join, 3.0)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Local Detector WebSocket service')
    parser.add_argument('--check', action='store_true', help='Print paths and dependency availability without starting workers')
    arguments = parser.parse_args()
    if arguments.check:
        print(json.dumps({'channelsFile': CHANNELS_FILE,
                          'modelSearchDirs': [str(path) for path in MODEL_SEARCH_DIRS],
                          'rknnAvailable': RKNN_AVAILABLE}, ensure_ascii=False))
    else:
        server = DetectorServer()
        try:
            asyncio.run(server.run())
        except KeyboardInterrupt:
            pass
