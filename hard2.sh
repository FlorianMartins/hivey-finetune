#!/bin/bash
# The two families whose world or check was wrong, again: the MoE (new seed), and ft4 on a sample.
cd /root/projects/hivey-finetune || exit 1
HARD_SCALE=0.02 HARD_ONLY=aggregate,constraints node -e "import('./hard-tasks.mjs').then(m=>{const t=m.TASKS[0];const b=t.world();console.log(t.id, t.turns[0].slice(0,80), '|', b.activePage().title)})"
serve() {
  /opt/llm/llama.cpp/build/bin/llama-server --host 127.0.0.1 --port 18770 --model "$1" --parallel 4 --ctx-size 131072 --jinja -ngl 99 > results/hard-server.log 2>&1 &
  S=$!
  for _ in $(seq 1 150); do curl -sf http://127.0.0.1:18770/health >/dev/null && break; sleep 2; done
}
serve "$PWD/models/ft4/Q4_K_M.gguf"
HARD_SEED=6 HARD_SCALE=0.15 HARD_ONLY=aggregate,constraints node run.mjs --tasks hard-tasks.mjs --as hard2-ft4 --jobs 4 --lean --timeout 240 > results/hard2-ft4.log 2>&1
kill $S; wait $S 2>/dev/null
echo "ft4: $(tail -1 results/hard2-ft4.log)"
grep FAIL results/hard2-ft4.log | sed -E 's/\[([a-z]+)-[0-9]+\].*/\1/' | sort | uniq -c
serve /root/projects/hivey-local-ai-cache/models/Qwen3.6-35B-A3B-UD-Q3_K_XL.gguf
rm -f data/hard2-moe.jsonl
HARD_SEED=7 HARD_SCALE=1 HARD_ONLY=aggregate,constraints node run.mjs --tasks hard-tasks.mjs --as hard2-moe --jobs 4 --lean --timeout 300 --capture data/hard2-moe.jsonl > results/hard2-moe.log 2>&1
kill $S; wait $S 2>/dev/null
echo "MoE: $(tail -1 results/hard2-moe.log)"
grep FAIL results/hard2-moe.log | sed -E 's/\[([a-z]+)-[0-9]+\].*/\1/' | sort | uniq -c
wc -l data/hard2-moe.jsonl
