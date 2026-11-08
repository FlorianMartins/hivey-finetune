#!/bin/bash
# The 27B solves generated worlds in its own words; its passed conversations are kept for training.
cd /root/projects/hivey-finetune || exit 1
used=$(nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits)
if [ "$used" -gt 2000 ]; then echo "CARD TAKEN: $used MiB"; exit 1; fi
rm -f data/teacher.jsonl; TEACHER_SCALE=${TEACHER_SCALE:-0.25}
/opt/llm/llama.cpp/build/bin/llama-server --host 127.0.0.1 --port 18770 --model /root/projects/hivey-local-ai-cache/models/Qwen3.8-27B-UD-Q3_K_XL.gguf --parallel 3 --ctx-size 98304 --jinja -ngl 99 > results/teacher-server.log 2>&1 &
S=$!
for _ in $(seq 1 150); do
  curl -sf http://127.0.0.1:18770/health >/dev/null && break
  sleep 2
done
TEACHER_SCALE=${TEACHER_SCALE:-0.25} node run.mjs --tasks teacher-tasks.mjs --as teacher-traces --jobs 3 --lean --timeout 300 --capture data/teacher.jsonl > results/teacher-traces.log 2>&1
kill $S
wait $S 2>/dev/null
tail -1 results/teacher-traces.log
wc -l data/teacher.jsonl
