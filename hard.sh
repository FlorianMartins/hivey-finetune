#!/bin/bash
# Are the hard worlds hard? ft4 on a sample of them; then the MoE solves them all, its passes kept.
cd /root/projects/hivey-finetune || exit 1
serve() {
  /opt/llm/llama.cpp/build/bin/llama-server --host 127.0.0.1 --port 18770 --model "$1" --parallel 4 --ctx-size 131072 --jinja -ngl 99 > results/hard-server.log 2>&1 &
  S=$!
  for _ in $(seq 1 150); do curl -sf http://127.0.0.1:18770/health >/dev/null && break; sleep 2; done
}
serve "$PWD/models/ft4/Q4_K_M.gguf"
HARD_SEED=6 HARD_SCALE=0.12 node run.mjs --tasks hard-tasks.mjs --as hard-ft4 --jobs 4 --lean --timeout 240 > results/hard-ft4.log 2>&1
kill $S; wait $S 2>/dev/null
echo "ft4 on hard worlds: $(tail -1 results/hard-ft4.log)"
grep FAIL results/hard-ft4.log | sed -E 's/\[([a-z]+)-[0-9]+\].*/\1/' | sort | uniq -c | sort -rn
serve /root/projects/hivey-local-ai-cache/models/Qwen3.6-35B-A3B-UD-Q3_K_XL.gguf
rm -f data/hard-moe.jsonl
HARD_SEED=5 HARD_SCALE=1 node run.mjs --tasks hard-tasks.mjs --as hard-moe --jobs 4 --lean --timeout 300 --capture data/hard-moe.jsonl > results/hard-moe.log 2>&1
kill $S; wait $S 2>/dev/null
echo "MoE on hard worlds: $(tail -1 results/hard-moe.log)"
grep FAIL results/hard-moe.log | sed -E 's/\[([a-z]+)-[0-9]+\].*/\1/' | sort | uniq -c | sort -rn
wc -l data/hard-moe.jsonl
