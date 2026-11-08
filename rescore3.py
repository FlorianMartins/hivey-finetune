"""heldout3, as scored, and with three checks that rejected right answers fixed (from the stored answers;
the test file itself is not changed). The fixes: citing the outdated source as such is allowed; a price of
another product near the word is not an invented price."""
import json
import re
from pathlib import Path

nums = lambda s: [float(x.replace(',', '.')) for x in re.findall(r'\d+(?:[.,]\d+)?', s.replace(' ', ' '))]


def fixed(task, answer, passed):
    if task == 'g-fact-two-sources':
        return bool(re.search(r'\b3\b', answer)) and 'juillet' in answer.lower() and 129 in nums(answer)
    if task == 'g-fact-transit':
        return any(abs(n - 16.5) < 1e-6 for n in nums(answer))
    if task == 'g-not-there':
        said = re.search(r"(pas de|aucun|ne vend|ne propose|n'en|n'est pas vendu|pas vendu|ne mentionne pas)", answer, re.I)
        invented = any('mozzarella' in s.lower() and re.search(r'\d+\s*€', s) for s in re.split(r'[.\n]', answer))
        return bool(said) and not invented
    return passed


print(f"{'model':10} {'as scored':>18} {'checks fixed':>18}")
for name in ('dense27', 'moe2', 'ft4', 'ft6', 'base4b'):
    raw, fix = [], []
    for i in (1, 2, 3):
        d = json.loads(Path(f'/root/projects/hivey-finetune/results/final3-{name}-{i}.json').read_text())
        raw.append(sum(r['pass'] for r in d['results']))
        fix.append(sum(fixed(r['id'], r['answer'], r['pass']) for r in d['results']))
    print(f"{name:10} {str(raw):>12} {sum(raw) / 3:5.1f} {str(fix):>12} {sum(fix) / 3:5.1f}")
