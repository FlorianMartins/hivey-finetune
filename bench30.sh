#!/bin/bash
# bench30.sh <gguf> <name>: the sidebar's own 30 tasks, three runs at once, with the browser's tools.
GGUF=$1; NAME=$2
T=/root/projects/hivey-finetune/results/bench30-$NAME
S=/root/projects/hivey-finetune/sidebar
used=$(nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits)
if [ "$used" -gt 2000 ]; then echo "CARD TAKEN: $used MiB"; exit 1; fi
mkdir -p "$T"
/opt/llm/llama.cpp/build/bin/llama-server --host 127.0.0.1 --port 18771 --model "$GGUF" --parallel 3 --ctx-size 98304 --jinja -ngl 99 $SERVER_EXTRA > "$T/server.log" 2>&1 &
SERVER=$!
for _ in $(seq 1 150); do
  curl -sf http://127.0.0.1:18771/health >/dev/null && break
  sleep 2
done
cd "$S" || exit 1
PIDS=""
for i in 1 2 3; do
  node scripts/bench.mjs --root "$S" --as "$NAME-$i" --url http://127.0.0.1:18771/v1 --model "$NAME" --level none --lean --out "$T/$i.json" > "$T/$i.log" 2>&1 &
  PIDS="$PIDS $!"
done
wait $PIDS
kill $SERVER
wait $SERVER 2>/dev/null
python3 - "$T" <<'EOF'
import collections, json, sys
from pathlib import Path
miss = collections.Counter(); errs = 0; scores = []; agent = []; secs = []
for f in sorted(Path(sys.argv[1]).glob('[123].json')):
    d = json.loads(f.read_text()); r = d['results']
    scores.append(d['passed']); agent.append(sum(1 for x in r if x['pass'] and x['id'].startswith('agent')))
    secs.append(round(sum(x['seconds'] for x in r if x['id'].startswith('agent')) / max(1, sum(1 for x in r if x['id'].startswith('agent')))))
    for x in r:
        if not x['pass']:
            miss[x['id']] += 1
            errs += 'HTTP' in str(x.get('why')) or 'fetch failed' in str(x.get('why'))
print('scores', scores, 'of', len(r), 'agent', agent, 's/agent task', secs, 'errors', errs)
print('missed', dict(miss))
EOF
