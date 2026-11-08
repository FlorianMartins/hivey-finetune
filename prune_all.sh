#!/bin/bash
# Pruned to 75 % and 50 % of the experts, as Q4_K_M GGUF files, then measured like every other model.
cd /root/projects/hivey-finetune || exit 1
for keep in 0.75 0.5; do
  name=moe$(python3 -c "print(int($keep*100))")
  venv/bin/python prune.py $keep models/$name-hf 2>&1 | tail -1
  venv/bin/python /opt/llm/llama.cpp/convert_hf_to_gguf.py models/$name-hf --no-mtp --outtype bf16 --outfile models/$name-bf16.gguf 2>&1 | tail -1 | cut -c1-120
  LD_LIBRARY_PATH=llama-build/bin llama-build/bin/llama-quantize models/$name-bf16.gguf models/$name-Q4_K_M.gguf Q4_K_M 2>&1 | tail -1 | cut -c1-100
  rm -f models/$name-bf16.gguf
  ls -la models/$name-Q4_K_M.gguf | cut -c25-120
done
for name in moe75 moe50; do
  echo "== $name"
  bash bench30.sh "$PWD/models/$name-Q4_K_M.gguf" "$name"
  bash measure.sh "$PWD/models/$name-Q4_K_M.gguf" "d$name" heldout.mjs --lean | head -4
done
