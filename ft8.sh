#!/bin/bash
# ft8: ft4 taught to give price_total the request's quantities and the units as written; short and gentle.
# Kept only if it gains on heldout-units2 (opened once, ft4 measured the same way) and loses nothing on the bench.
cd /root/projects/hivey-finetune || exit 1
node --input-type=module - <<'EOF'
import { readFileSync, writeFileSync } from "node:fs";
import { FORBIDDEN } from "./families.mjs";
const lines = (f) => readFileSync(f, "utf8").split("\n").filter(Boolean);
const clean = (l) => !FORBIDDEN.test(JSON.stringify(JSON.parse(l).messages.filter((m) => m.role !== "system")));
const some = (f, n) => lines(f).filter(clean).sort(() => Math.random() - 0.5).slice(0, n);
const mix = [...some("data/units-v2.jsonl", 400), ...some("data/self-ft4.jsonl", 300), ...some("data/teacher-moe.jsonl", 200), ...some("data/hard2-moe.jsonl", 100)];
writeFileSync("data/mix8.jsonl", mix.join("\n") + "\n");
console.log("mix8", mix.length);
EOF
venv/bin/python prepare.py data/mix8.jsonl data/prepared-mix8 2>&1 | grep -E "^(train|valid)" | cut -c1-120
export BASE=models/ft4/merged
MEASURE_TASKS=heldout-units.mjs DATA=data/prepared-mix8 bash trial.sh ft8 3e-5 1200 2>&1 | grep -E "ft8-|left out|FAIL|THE TEST|TRAINING" | cut -c1-200
echo "== bench 30"
bash bench30.sh "$PWD/models/ft8/Q4_K_M.gguf" ft8
echo "== heldout-units2, opened once: ft4 and ft8 with the same tools"
for m in ft4 ft8; do
  bash measure.sh "$PWD/models/$m/Q4_K_M.gguf" "units2-$m" heldout-units2.mjs --lean | head -10
done
