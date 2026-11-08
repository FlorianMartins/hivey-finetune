#!/bin/bash
# Second trial: the 27B's own traces, plus a few scripted ones; gentler; judged on the 30-task bench.
cd /root/projects/hivey-finetune || exit 1
python3 - <<'EOF'
import json, random
random.seed(5)
teacher = [l for l in open('data/teacher.jsonl')]
expert = [l for l in open('data/lean2.jsonl')]
random.shuffle(expert)
with open('data/mix4.jsonl', 'w') as f:
    f.writelines(teacher + expert[:600])
print('mix', len(teacher), 'teacher +', 600, 'expert')
EOF
venv/bin/python prepare.py data/mix4.jsonl data/prepared-mix4 2>&1 | grep -E "^(train|valid)" | cut -c1-120
sed -i 's#train.py data/prepared-lean "models#train.py ${DATA:-data/prepared-lean} "models#' trial.sh
DATA=data/prepared-mix4 bash trial.sh ft4 1e-4 0 2>&1 | grep -E "ft4-|valid|FAIL|THE TEST|TRAINING" | cut -c1-200
echo "== bench 30"
bash bench30.sh "$PWD/models/ft4/Q4_K_M.gguf" ft4
