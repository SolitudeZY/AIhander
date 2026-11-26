#!/bin/bash

echo "starting detector v0.1 $(date '+%Y-%m-%d %H:%M:%S')"

cd /home/kickpi/landslide/rk3576_deploy/detector/
nohup /home/kickpi/miniconda3/envs/rknn/bin/python detector.py > "detector_$(date +%Y%m%d_%H%M%S).log" 2>&1 &
