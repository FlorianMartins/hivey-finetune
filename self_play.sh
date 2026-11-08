#!/bin/bash
# ft4 solves new worlds (seed 4); its passed conversations are kept. The worlds it fails are listed for the MoE.
cd /root/projects/hivey-finetune || exit 1
used=$(nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits)
if [ "$used" -gt 2000 ]; then echo "CARD TAKEN: $used MiB"; exit 1; fi
rm -f data/self-ft4.jsonl
/opt/llm/llama.cpp/build/bin/llama-server --host 127.0.0.1 --port 18770 --model "$PWD/models/ft4/Q4_K_M.gguf" --parallel 4 --ctx-size 131072 --jinja -ngl 99 > results/self-server.log 2>&1 &
S=$!
for _ in $(seq 1 60); do
  curl -sf http://127.0.0.1:18770/health >/dev/null && break
  sleep 2
done
TEACHER_SEED=4 TEACHER_SCALE=0.6 node run.mjs --tasks teacher-tasks.mjs --as self-ft4 --jobs 4 --lean --timeout 240 --capture data/self-ft4.jsonl > results/self-ft4.log 2>&1
kill $S
wait $S 2>/dev/null
tail -1 results/self-ft4.log
wc -l data/self-ft4.jsonl
grep FAIL results/self-ft4.log | sed -E 's/\[([a-z]+)-[0-9]+\].*/\1/' | sort | uniq -c | sort -rn | head -8
