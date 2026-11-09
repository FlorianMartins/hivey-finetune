#!/bin/bash
# The calculate guard: units dev for ft4 and the MoE, then the bench for both (no drop allowed).
cd /root/projects/hivey-finetune || exit 1
RUN=units3dev bash units1.sh 2>&1 | grep -vE "^[0-9a-f]{12} |: OK$"
M=/root/projects/hivey-local-ai-cache/models
echo "== bench ft4"
bash bench30.sh "$PWD/models/ft4/Q4_K_M.gguf" g-ft4
echo "== bench moe2"
bash bench30.sh "$M/Qwen3.6-35B-A3B-UD-IQ2_M.gguf" g-moe2
