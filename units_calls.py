"""For each unit task: which tool was called and what came back, from the server's request log is not kept,
so from the answers and tool names; plus the price_total arguments, replayed through the simulated world."""
import json
import sys
from pathlib import Path

for i in (1, 2, 3):
    d = json.loads(Path(f'/root/projects/hivey-finetune/results/{sys.argv[1]}-{i}.json').read_text())
    for r in d['results']:
        print(i, r['id'], 'PASS' if r['pass'] else 'FAIL', r['actions'], '|', r['answer'][:150].replace('\n', ' / '))
