#!/bin/bash
# ft8 on the full prepared data (prepare.py no longer stops at a trace without tools).
cd /root/projects/hivey-finetune || exit 1
export BASE=models/ft4/merged
MEASURE_TASKS=heldout-units.mjs DATA=data/prepared-mix8 bash trial.sh ft8 3e-5 1200 2>&1 | grep -E "ft8-|left out|FAIL|THE TEST|TRAINING" | cut -c1-200
echo "== bench 30"
bash bench30.sh "$PWD/models/ft8/Q4_K_M.gguf" ft8
echo "== heldout-units2, opened once: ft4 and ft8 with the same tools"
for m in ft4 ft8; do
  bash measure.sh "$PWD/models/$m/Q4_K_M.gguf" "units2-$m" heldout-units2.mjs --lean | head -10
done
