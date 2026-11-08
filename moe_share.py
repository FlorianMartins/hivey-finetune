"""How concentrated the routing is on our agent work: by choice counts, and by weight where it is valid."""
import json
import math

d = json.load(open('/root/projects/hivey-finetune/results/moe-stats.json'))
E = d['experts']
bad = [i for i, row in enumerate(d['weight']) if any(math.isnan(x) for x in row)]
print('layers', len(d['count']), 'tokens', d['tokens'], 'layers with nan weights', bad[:20], len(bad))
for name in ('count', 'weight'):
    rows = [r for i, r in enumerate(d[name]) if i not in bad] if name == 'weight' else d[name]
    for keep in (0.25, 0.5, 0.75):
        shares = []
        for r in rows:
            s = sorted(r, reverse=True)
            total = sum(s)
            shares.append(sum(s[: int(E * keep)]) / total if total else 0)
        print(f'{name}: keeping {int(keep * 100)} % of experts keeps {100 * sum(shares) / len(shares):.1f} % on average, worst layer {100 * min(shares):.1f} %')
c = d['count'][20]
s = sorted(c, reverse=True)
print('layer 20, most and least chosen:', [int(x) for x in s[:5]], [int(x) for x in s[-5:]], 'uniform would be', int(sum(c) / E))
