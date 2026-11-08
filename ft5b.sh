#!/bin/bash
cd /root/projects/hivey-finetune || exit 1
DATA=data/prepared-mix5 bash trial.sh ft5 1e-4 6000 2>&1 | grep -E "ft5-|valid|FAIL|THE TEST|TRAINING" | cut -c1-200
echo "== bench 30"
bash bench30.sh "$PWD/models/ft5/Q4_K_M.gguf" ft5
