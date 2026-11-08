"""What each failed task did: tools called, time, end of the answer."""
import json
import sys
from pathlib import Path

for name in sys.argv[1:]:
    for path in sorted(Path('/root/projects/hivey-finetune/results').glob(f'{name}-[123].json')):
        data = json.loads(path.read_text())
        print(f"== {path.stem}: {data['passed']}/{data['total']} {data['seconds']} s")
        for r in data['results']:
            if not r['pass']:
                print(f"  {r['id']} {r['seconds']}s {r['actions'][:14]}")
                print('     ' + r['answer'][:260].replace('\n', ' / '))
