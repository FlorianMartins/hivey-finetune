"""The expert's total in the browser's format: the request's quantities once, each unit copied as written."""
from pathlib import Path

p = Path('/root/projects/hivey-finetune/families4.mjs')
t = p.read_text()
pairs = [
    ('''    steps: [call("price_total", { lines: counted.map((l) => ({ item: l.item, price: l.price, per: per(l), count: l.free ? 0 : l.n })) }),''',
     '''    steps: [call("price_total", {
      quantities: { people: q.people, ...(t.days ? { days: q.days } : {}) },
      lines: counted.map((l) => ({ item: l.item, price: l.price, per: per(l), ...(/Item/.test(l.unit) ? { count: q.items } : {}), ...(l.free ? { free: true } : {}) })),
    }),'''),
    # « chacun(e) » names a person as much as a thing: a page that means a thing says so.
    ('''"chacun(e)", "à l'unité"]''', '''"par article", "à l'unité"]'''),
    ('''"/unité/jour", "chacune, par jour"]''', '''"/unité/jour", "l'article, par jour"]'''),
]
for old, new in pairs:
    assert t.count(old) == 1, old[:60]
    t = t.replace(old, new)
p.write_text(t)
print('ok')
