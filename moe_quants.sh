#!/bin/bash
# The whole MoE, compressed harder instead of pruned: same sizes as the pruned ones, every expert kept.
cd /root/projects/hivey-finetune || exit 1
M=/root/projects/hivey-local-ai-cache/models
for q in UD-Q3_K_XL UD-IQ3_XXS UD-IQ2_M; do
  venv/bin/hf download unsloth/Qwen3.6-35B-A3B-GGUF "Qwen3.6-35B-A3B-$q.gguf" --local-dir $M 2>&1 | tail -1 | cut -c1-100
done
for q in UD-Q3_K_XL UD-IQ3_XXS UD-IQ2_M; do
  name=q36-$(echo $q | tr -d '_' | tr 'A-Z' 'a-z')
  echo "== $q"
  bash bench30.sh "$M/Qwen3.6-35B-A3B-$q.gguf" "$name"
  bash measure.sh "$M/Qwen3.6-35B-A3B-$q.gguf" "d$name" heldout.mjs --lean | head -4
done
