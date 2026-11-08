#!/bin/bash
# ft6 again, the samples too long for the card left out (counted).
cd /root/projects/hivey-finetune || exit 1
export BASE=models/ft4/merged
DATA=data/prepared-mix6 bash trial.sh ft6 5e-5 3000 2>&1 | grep -E "ft6-|valid|FAIL|THE TEST|TRAINING" | cut -c1-200
grep -E "left out" models/ft6.train.log
echo "== bench 30"
bash bench30.sh "$PWD/models/ft6/Q4_K_M.gguf" ft6
echo "== hard worlds, the sample ft4 did: 142/196"
/opt/llm/llama.cpp/build/bin/llama-server --host 127.0.0.1 --port 18770 --model "$PWD/models/ft6/Q4_K_M.gguf" --parallel 4 --ctx-size 131072 --jinja -ngl 99 > results/hard3-server.log 2>&1 &
S=$!
for _ in $(seq 1 60); do curl -sf http://127.0.0.1:18770/health >/dev/null && break; sleep 2; done
HARD_SEED=8 HARD_SCALE=0.15 node run.mjs --tasks hard-tasks.mjs --as hard3-ft6 --jobs 4 --lean --timeout 240 > results/hard3-ft6.log 2>&1
kill $S; wait $S 2>/dev/null
echo "ft6: $(tail -1 results/hard3-ft6.log)"
grep FAIL results/hard3-ft6.log | sed -E 's/\[([a-z]+)-[0-9]+\].*/\1/' | sort | uniq -c | tr '\n' ' '; echo
