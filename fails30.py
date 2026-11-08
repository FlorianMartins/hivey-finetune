"""What the model did on the bench's failed tasks."""
import json
import sys
from pathlib import Path

T = Path(f'/root/projects/hivey-finetune/results/bench30-{sys.argv[1]}')
only = sys.argv[2:]
for f in sorted(T.glob('[123].json')):
    d = json.loads(f.read_text())
    print('==', f.stem, d['passed'], '/', d['total'])
    for x in d['results']:
        if not x['pass'] and (not only or x['id'].startswith(tuple(only))):
            print(f"  {x['id']} {x['seconds']}s {x.get('requests')} req — {str(x.get('why'))[:90]}")
            print('     ' + (x.get('answer') or '')[:230].replace('\n', ' / '))
