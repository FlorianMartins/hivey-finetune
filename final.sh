#!/bin/bash
# The final test, opened once: 12 tasks no model, prompt or data has seen, three runs of each candidate.
cd /root/projects/hivey-finetune || exit 1
sha256sum -c frozen.sha256 2>&1 | grep heldout2
M=/root/projects/hivey-local-ai-cache/models
for spec in "$M/Qwen3.6-35B-A3B-UD-IQ2_M.gguf:moe2" "$M/Qwen3.6-35B-A3B-UD-Q3_K_XL.gguf:moe3" "$M/Qwen3.8-27B-UD-Q3_K_XL.gguf:dense27" "$PWD/models/ft4/Q4_K_M.gguf:ft4" "$M/Qwen3.5-4B-Q4_K_M.gguf:base4b"; do
  IFS=: read -r file name <<< "$spec"
  echo "== $name"
  bash measure.sh "$file" "final-$name" heldout2.mjs --lean | head -6
done
