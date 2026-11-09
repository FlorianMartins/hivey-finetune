#!/bin/bash
# The units dev test with price_total, against units0 (before it).
cd /root/projects/hivey-finetune || exit 1
bash sync_lean.sh | head -6
M=/root/projects/hivey-local-ai-cache/models
for spec in "$PWD/models/ft4/Q4_K_M.gguf:ft4" "$M/Qwen3.6-35B-A3B-UD-IQ2_M.gguf:moe2"; do
  IFS=: read -r file name <<< "$spec"
  echo "== $name"
  bash measure.sh "$file" "${RUN:-units1}-$name" heldout-units.mjs --lean | head -9
done
