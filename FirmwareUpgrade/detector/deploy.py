import paramiko
import os
import sys

HOST = os.environ.get('DETECTOR_HOST', '')
USER = os.environ.get('DETECTOR_USER', 'kickpi')
PASS = os.environ.get('DETECTOR_PASSWORD', '')
REMOTE_DIR = '/home/kickpi/landslide/rk3576_deploy/detector/'
LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))

def check_env(ssh):
    print("Checking board environment...")
    # Check python version
    stdin, stdout, stderr = ssh.exec_command('/home/kickpi/miniconda3/envs/rknn/bin/python --version')
    print("Python version:", stdout.read().decode().strip())
    
    # Check if pip packages are installed
    stdin, stdout, stderr = ssh.exec_command('/home/kickpi/miniconda3/envs/rknn/bin/python -c "import websockets; import PIL; import cv2; print(\'Dependencies are installed\')"')
    err = stderr.read().decode().strip()
    if err:
        print("Missing dependencies, installing via pip...")
        # Try to install them
        stdin, stdout, stderr = ssh.exec_command('/home/kickpi/miniconda3/envs/rknn/bin/pip install websockets Pillow opencv-python-headless')
        print(stdout.read().decode().strip())
        print(stderr.read().decode().strip())
    else:
        print(stdout.read().decode().strip())

def create_remote_dir(sftp, remote_directory):
    dirs = remote_directory.split('/')
    path = ''
    for d in dirs:
        if not d:
            continue
        path += f'/{d}'
        try:
            sftp.stat(path)
        except IOError:
            sftp.mkdir(path)

def sync_directory(sftp, local_dir, remote_dir):
    for item in os.listdir(local_dir):
        # 忽略不必要的文件
        if item in ['__pycache__', 'deploy.py', 'requirements.txt', '交互文档.md', 'channels.json']:
            continue
            
        local_path = os.path.join(local_dir, item)
        remote_path = f"{remote_dir}/{item}"
        
        if os.path.isfile(local_path):
            print(f"Uploading {local_path} -> {remote_path}")
            sftp.put(local_path, remote_path)
        elif os.path.isdir(local_path):
            try:
                sftp.stat(remote_path)
            except IOError:
                sftp.mkdir(remote_path)
            sync_directory(sftp, local_path, remote_path)

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        print(f"Connecting to {USER}@{HOST}...")
        ssh.connect(HOST, username=USER, password=PASS, timeout=10)
        
        check_env(ssh)
        
        print("Starting file synchronization...")
        sftp = ssh.open_sftp()
        create_remote_dir(sftp, REMOTE_DIR)
        
        sync_directory(sftp, LOCAL_DIR, REMOTE_DIR)
        
        sftp.close()
        print("Deployment completed successfully.")
        
        print("To run the detector on the board, use:")
        print(f"ssh {USER}@{HOST}")
        print(f"cd {REMOTE_DIR}")
        print("/home/kickpi/miniconda3/envs/rknn/bin/python detector.py")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        ssh.close()

if __name__ == '__main__':
    main()
