#!/bin/bash
# More traces, with the MoE (as precise as the 27B, twice as fast) as the teacher, on new worlds (seed 3).
cd /root/projects/hivey-finetune || exit 1
used=$(nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits)
if [ "$used" -gt 2000 ]; then echo "CARD TAKEN: $used MiB"; exit 1; fi
rm -f data/teacher-moe.jsonl
/opt/llm/llama.cpp/build/bin/llama-server --host 127.0.0.1 --port 18770 --model /root/projects/hivey-local-ai-cache/models/Qwen3.6-35B-A3B-UD-Q3_K_XL.gguf --parallel 4 --ctx-size 131072 --jinja -ngl 99 > results/teacher-moe-server.log 2>&1 &
S=$!
for _ in $(seq 1 150); do
  curl -sf http://127.0.0.1:18770/health >/dev/null && break
  sleep 2
done
TEACHER_SEED=3 TEACHER_SCALE=0.6 node run.mjs --tasks teacher-tasks.mjs --as teacher-moe --jobs 4 --lean --timeout 300 --capture data/teacher-moe.jsonl > results/teacher-moe.log 2>&1
kill $S
wait $S 2>/dev/null
tail -1 results/teacher-moe.log
wc -l data/teacher-moe.jsonl
grep FAIL results/teacher-moe.log | sed -E 's/\[([a-z]+)-[0-9]+\].*/\1/' | sort | uniq -c | sort -rn | head -6
