#!/bin/bash
# Before any change for units: the models as they are on the unit totals.
cd /root/projects/hivey-finetune || exit 1
sha256sum heldout-units.mjs >> frozen.sha256
M=/root/projects/hivey-local-ai-cache/models
for spec in "$PWD/models/ft4/Q4_K_M.gguf:ft4" "$M/Qwen3.6-35B-A3B-UD-IQ2_M.gguf:moe2" "$M/Qwen3.8-27B-UD-Q3_K_XL.gguf:dense27"; do
  IFS=: read -r file name <<< "$spec"
  echo "== $name"
  bash measure.sh "$file" "units0-$name" heldout-units.mjs --lean | head -9
done
