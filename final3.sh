#!/bin/bash
# The third final test, opened once: does the 4B do, or is the MoE needed?
cd /root/projects/hivey-finetune || exit 1
sha256sum -c frozen.sha256 2>&1 | grep heldout3
M=/root/projects/hivey-local-ai-cache/models
for spec in "$PWD/models/ft4/Q4_K_M.gguf:ft4" "$PWD/models/ft6/Q4_K_M.gguf:ft6" "$M/Qwen3.6-35B-A3B-UD-IQ2_M.gguf:moe2" "$M/Qwen3.8-27B-UD-Q3_K_XL.gguf:dense27" "$M/Qwen3.5-4B-Q4_K_M.gguf:base4b"; do
  IFS=: read -r file name <<< "$spec"
  echo "== $name"
  bash measure.sh "$file" "final3-$name" heldout3.mjs --lean | head -8
done
