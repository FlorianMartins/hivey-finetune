"""What the model put in its total's lines, on the failed unit tasks."""
import json
import sys
from pathlib import Path

name = sys.argv[1]
d = json.loads(Path(f'/root/projects/hivey-finetune/results/{name}.json').read_text())
for r in d['results']:
    if not r['pass']:
        print(r['id'], r['actions'], '|', r['answer'][:420].replace('\n', ' / '))
