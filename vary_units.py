"""Each unit, in the many ways sites write it."""
from pathlib import Path

p = Path('/root/projects/hivey-finetune/families4.mjs')
t = p.read_text()
pairs = [
    ('perPersonDay: { fr: "par personne et par jour",', 'perPersonDay: { fr: ["par personne et par jour", "par jour et par personne", "/pers./jour", "la journée, par participant", "par jour, chacun"],'),
    ('perPerson: { fr: "par personne, pour tout le séjour",', 'perPerson: { fr: ["par personne, pour tout le séjour", "par personne (forfait)", "/pers., une seule fois", "par participant, pour toute la durée", "chacun, quelle que soit la durée"],'),
    ('perDay: { fr: "par jour",', 'perDay: { fr: ["par jour", "la journée", "/jour", "chaque jour", "par jour, pour le groupe"],'),
    ('once: { fr: "une fois, par réservation",', 'once: { fr: ["une fois, par réservation", "forfait unique", "par commande", "une seule fois", "par dossier"],'),
    ('perItem: { fr: "par unité",', 'perItem: { fr: ["par unité", "l\'unité", "pièce", "chacun(e)", "à l\'unité"],'),
    ('perItemDay: { fr: "par unité et par jour",', 'perItemDay: { fr: ["par unité et par jour", "par jour et par unité", "l\'unité, la journée", "/unité/jour", "chacune, par jour"],'),
    ('const lines = [t.base, ...t.extras].map(([item, unit, lo, hi]) => ({ item, unit, price: price(lo, hi) }));',
     'const lines = [t.base, ...t.extras].map(([item, unit, lo, hi]) => ({ item, unit, price: price(lo, hi), word: pick(r, UNITS[unit].fr) }));'),
    ('const text = counted.map((l) => `${l.item} : ${money(l.price)} € ${UNITS[l.unit].fr}', 'const text = counted.map((l) => `${l.item} : ${money(l.price)} € ${l.word}'),
    ('const per = (l) => `${UNITS[l.unit].fr}${', 'const per = (l) => `${l.word}${'),
    (': `${money(l.price)} € × ${l.n} = ${money(l.amount)} €`} (${UNITS[l.unit].fr})`', ': `${money(l.price)} € × ${l.n} = ${money(l.amount)} €`} (${l.word})`'),
]
for old, new in pairs:
    assert t.count(old) == 1, old[:60]
    t = t.replace(old, new)
p.write_text(t)
print('ok')
