#!/bin/bash
# measure.sh <gguf path> <name> [tasks file]: three runs at once on the card. Never touches llama-swap.
cd /root/projects/hivey-finetune || exit 1
GGUF=$1; NAME=$2; TASKS=${3:-heldout.mjs}; EXTRA=$4
BIN=/opt/llm/llama.cpp/build/bin/llama-server
used=$(nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits)
if [ "$used" -gt 2000 ]; then echo "CARD TAKEN: $used MiB"; exit 1; fi
mkdir -p results
"$BIN" --host 127.0.0.1 --port 18770 --model "$GGUF" --parallel 3 --ctx-size 98304 --jinja -ngl 99 $SERVER_EXTRA > "results/$NAME-server.log" 2>&1 &
SERVER=$!
for _ in $(seq 1 150); do
  curl -sf http://127.0.0.1:18770/health >/dev/null && break
  sleep 2
done
PIDS=""
for i in 1 2 3; do
  node run.mjs --tasks "$TASKS" --as "$NAME-$i" --model "$NAME" $EXTRA > "results/$NAME-$i.log" 2>&1 &
  PIDS="$PIDS $!"
done
wait $PIDS
kill $SERVER
wait $SERVER 2>/dev/null
tail -qn1 results/$NAME-[123].log
grep -h FAIL results/$NAME-[123].log | sed -E 's/ [0-9.]+s [0-9]+ req//' | cut -c1-120 | sort | uniq -c
grep -c "HTTP [0-9]\|fetch failed" results/$NAME-1.log results/$NAME-2.log results/$NAME-3.log
