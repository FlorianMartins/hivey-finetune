#!/bin/bash
# ft7: ft4 taught to add up with price_total, without forgetting the rest. Judged on units and on the bench.
cd /root/projects/hivey-finetune || exit 1
used=$(nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits)
if [ "$used" -gt 2000 ]; then echo "CARD TAKEN: $used MiB"; exit 1; fi
/opt/llm/llama.cpp/build/bin/llama-server --host 127.0.0.1 --port 18770 --model /root/projects/hivey-local-ai-cache/models/Qwen3.6-35B-A3B-UD-Q3_K_XL.gguf --parallel 4 --ctx-size 131072 --jinja -ngl 99 > results/units-moe-server.log 2>&1 &
S=$!
for _ in $(seq 1 150); do curl -sf http://127.0.0.1:18770/health >/dev/null && break; sleep 2; done
rm -f data/units-moe.jsonl
UNIT_SEED=9 UNIT_SCALE=1 node run.mjs --tasks unit-tasks.mjs --as units-moe --jobs 4 --lean --timeout 200 --capture data/units-moe.jsonl > results/units-moe.log 2>&1
kill $S; wait $S 2>/dev/null
echo "MoE on unit totals: $(tail -1 results/units-moe.log)"
grep -c '"price_total"' data/units-moe.jsonl
node --input-type=module - <<'EOF'
import { readFileSync, writeFileSync } from "node:fs";
import { FORBIDDEN } from "./families.mjs";
const lines = (f) => readFileSync(f, "utf8").split("\n").filter(Boolean);
const clean = (l) => !FORBIDDEN.test(JSON.stringify(JSON.parse(l).messages.filter((m) => m.role !== "system")));
const some = (f, n) => lines(f).filter(clean).sort(() => Math.random() - 0.5).slice(0, n);
const mix = [...some("data/units-expert.jsonl", 300), ...some("data/units-moe.jsonl", 400), ...some("data/self-ft4.jsonl", 300), ...some("data/hard2-moe.jsonl", 200), ...some("data/teacher-moe.jsonl", 200)];
writeFileSync("data/mix7.jsonl", mix.join("\n") + "\n");
console.log("mix7", mix.length);
EOF
venv/bin/python prepare.py data/mix7.jsonl data/prepared-mix7 2>&1 | grep -E "^(train|valid)" | cut -c1-120
export BASE=models/ft4/merged
sed -i 's#bash measure.sh "$PWD/models/$NAME/Q4_K_M.gguf" "$NAME" heldout.mjs --lean#bash measure.sh "$PWD/models/$NAME/Q4_K_M.gguf" "$NAME" ${MEASURE_TASKS:-heldout.mjs} --lean#' trial.sh
MEASURE_TASKS=heldout-units.mjs DATA=data/prepared-mix7 bash trial.sh ft7 5e-5 2500 2>&1 | grep -E "ft7-|left out|FAIL|THE TEST|TRAINING" | cut -c1-200
echo "== bench 30"
bash bench30.sh "$PWD/models/ft7/Q4_K_M.gguf" ft7
