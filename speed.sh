#!/bin/bash
# One user, one agent task at a time: how long it takes without a card, and with only the attention on a small card.
cd /root/projects/hivey-finetune/sidebar || exit 1
M=/root/projects/hivey-local-ai-cache/models
ONLY=$(grep -oE 'id: "agent-[a-z-]+"' bench/tasks-agent.mjs | sed -E 's/id: "(.*)"/\1/' | paste -sd,)
run() { # file name server-args
  /opt/llm/llama.cpp/build/bin/llama-server --host 127.0.0.1 --port 18772 --model "$M/$1.gguf" --parallel 1 --ctx-size 32768 --jinja $3 > /root/projects/hivey-finetune/results/speed-$2.server.log 2>&1 &
  S=$!
  for _ in $(seq 1 200); do curl -sf http://127.0.0.1:18772/health >/dev/null && break; sleep 3; done
  timeout 5400 node scripts/bench.mjs --root . --only "$ONLY" --as "speed-$2" --url http://127.0.0.1:18772/v1 --model "$2" --level none --lean --out /root/projects/hivey-finetune/results/speed-$2.json > /root/projects/hivey-finetune/results/speed-$2.log 2>&1
  kill $S; wait $S 2>/dev/null
  python3 -c "
import json,statistics
d=json.load(open('/root/projects/hivey-finetune/results/speed-$2.json'))
s=[r['seconds'] for r in d['results']]
print('$2', d['passed'],'/',d['total'],'median',statistics.median(s),'s','max',max(s),'s')"
  grep -E "prompt eval time|^ *eval time" /root/projects/hivey-finetune/results/speed-$2.server.log | tail -2 | sed -E 's/.*= +//' | cut -c1-90
}
run Qwen3.6-35B-A3B-UD-IQ2_M moe2-cpu8 "-ngl 0 -t 8"
run Qwen3.6-35B-A3B-UD-IQ2_M moe2-smallcard "-ngl 99 --cpu-moe -t 8"
run Qwen3.5-4B-Q4_K_M 4b-cpu8 "-ngl 0 -t 8"
