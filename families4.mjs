// Totals where each price's unit decides how many times it counts. Topics apart from heldout-units*.mjs.
// The expert adds up with price_total: each line's unit copied from the page, next to its count.

import { createBrowser } from "./sidebar/bench/browser.mjs";
import { numbersIn, pass } from "./sidebar/bench/checks.mjs";
import { rng } from "./families.mjs";

const pick = (r, list) => list[Math.floor(r() * list.length)];
const int = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const shuffle = (r, list) => { const c = [...list]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; };
const call = (tool, args = {}) => () => ({ tool, args });
const say = (text) => () => ({ say: text });
const money = (n) => (Number.isInteger(n) ? `${n}` : n.toFixed(2).replace(".", ","));
const round2 = (n) => Math.round(n * 100) / 100;

// Kinds of unit: the words a page uses, and how many times it counts for a request.
const UNITS = {
  perPersonDay: { fr: ["par personne et par jour", "par jour et par personne", "/pers./jour", "la journée, par participant", "par jour, chacun"], n: (q) => q.people * q.days },
  perPerson: { fr: ["par personne, pour tout le séjour", "par personne (forfait)", "/pers., une seule fois", "par participant, pour toute la durée", "chacun, quelle que soit la durée"], n: (q) => q.people },
  perDay: { fr: ["par jour", "la journée", "/jour", "chaque jour", "par jour, pour le groupe"], n: (q) => q.days },
  once: { fr: ["une fois, par réservation", "forfait unique", "par commande", "une seule fois", "par dossier"], n: () => 1 },
  perItem: { fr: ["par unité", "l'unité", "pièce", "chacun(e)", "à l'unité"], n: (q) => q.items },
  perItemDay: { fr: ["par unité et par jour", "par jour et par unité", "l'unité, la journée", "/unité/jour", "chacune, par jour"], n: (q) => q.items * q.days },
};

const TOPICS = [
  { site: "escape-quai.example", title: "Escape game du Quai", days: false, base: ["Session", "perPerson", 22, 30], extras: [["Photo souvenir", "once", 8, 15], ["Boisson", "perPerson", 3, 5], ["Réservation en ligne", "once", 2, 4]], item: null, ask: (q) => `Pour ${q.people} personnes, avec la photo souvenir et une boisson chacun, combien en tout ?` },
  { site: "manege-clairiere.example", title: "Centre équestre de la Clairière", days: true, base: ["Cours d'équitation", "perPersonDay", 25, 40], extras: [["Location de bombe", "perPerson", 3, 6], ["Licence", "perPerson", 10, 25], ["Frais de dossier", "once", 5, 15]], item: null, ask: (q) => `${q.people} cavaliers pendant ${q.days} jours, avec une bombe louée chacun et la licence : combien au total ?` },
  { site: "atelier-cuisine-moulin.example", title: "Atelier cuisine du Moulin", days: false, base: ["Atelier", "perPerson", 45, 70], extras: [["Tablier offert", "perPerson", 0, 0], ["Boîtes à emporter", "perItem", 1, 3], ["Frais de réservation", "once", 3, 6]], item: "boîtes", ask: (q) => `On sera ${q.people} à l'atelier et on prendra ${q.items} boîtes à emporter. Combien ?` },
  { site: "spa-source-claire.example", title: "Spa de la Source Claire", days: true, base: ["Accès au spa", "perPersonDay", 18, 32], extras: [["Peignoir", "perPerson", 5, 9], ["Massage", "perItem", 40, 60], ["Casier", "perDay", 1, 3]], item: "massages", ask: (q) => `${q.people} personnes, ${q.days} jours d'accès, un peignoir chacun, ${q.items} massages, et un casier : combien ?` },
  { site: "location-tentes-ours.example", title: "Location de tentes — L'Ours", days: true, base: ["Tente 4 places", "perItemDay", 12, 20], extras: [["Matelas", "perPerson", 4, 7], ["Lampe frontale", "perPerson", 2, 4], ["Nettoyage", "once", 10, 20]], item: "tentes", ask: (q) => `Je loue ${q.items} tentes pour ${q.days} jours, pour ${q.people} personnes avec matelas et lampe chacun. Combien en tout ?` },
  { site: "coworking-halle.example", title: "Coworking La Halle", days: true, base: ["Poste de travail", "perPersonDay", 15, 25], extras: [["Casier", "perPerson", 5, 10], ["Salle de réunion", "perItem", 20, 35], ["Badge", "once", 10, 15]], item: "réservations de salle", ask: (q) => `${q.people} personnes pendant ${q.days} jours, un casier chacun, ${q.items} réservations de salle de réunion, et le badge : combien ?` },
  { site: "bowling-etoile.example", title: "Bowling de l'Étoile", days: false, base: ["Partie", "perItem", 6, 9], extras: [["Chaussures", "perPerson", 2, 4], ["Boisson", "perPerson", 3, 5]], item: "parties (une par joueur et par partie)", ask: (q) => `On est ${q.people}, chacun joue 2 parties, chaussures louées pour tous : combien ?`, items: (q) => q.people * 2 },
  { site: "ferry-iles-or.example", title: "Ferry des Îles d'Or", days: false, base: ["Traversée adulte", "perPerson", 14, 25], extras: [["Voiture", "perItem", 40, 70], ["Taxe portuaire", "perPerson", 1, 3], ["Frais de réservation", "once", 4, 8]], item: "voitures", ask: (q) => `Traversée pour ${q.people} adultes et ${q.items} voiture${q.items > 1 ? "s" : ""} : combien en tout ?` },
];

function totals(r) {
  const t = pick(r, TOPICS);
  const q = { people: int(r, 2, 6), days: t.days ? int(r, 2, 6) : 1, items: int(r, 1, 4) };
  if (t.items) q.items = t.items(q);
  const price = (lo, hi) => (lo === hi ? lo : int(r, lo, hi) + (r() < 0.3 ? 0.5 : 0));
  const lines = [t.base, ...t.extras].map(([item, unit, lo, hi]) => ({ item, unit, price: price(lo, hi), word: pick(r, UNITS[unit].fr) }));
  // Sometimes an offer from a threshold, written on the page.
  const offer = t.days && r() < 0.35 ? { item: lines[lines.length - 1].item, from: int(r, 2, q.days) } : null;
  const counted = lines.map((l) => {
    const n = UNITS[l.unit].n(q);
    const free = offer && offer.item === l.item && q.days >= offer.from;
    return { ...l, n, amount: free ? 0 : round2(l.price * n), free };
  });
  const total = round2(counted.reduce((a, l) => a + l.amount, 0));
  const url = `https://www.${t.site}/tarifs`;
  const text = counted.map((l) => `${l.item} : ${money(l.price)} € ${l.word}${l.free !== undefined && offer && offer.item === l.item ? ` (offert dès ${offer.from} jours)` : ""}.`).join("\n");
  const per = (l) => `${l.word}${offer && offer.item === l.item ? `, offert dès ${offer.from} jours` : ""}`;
  return {
    family: "totals",
    world: () => createBrowser({ tabs: [url], sites: { [url]: () => ({ title: `Tarifs — ${t.title}`, text }) } }),
    turns: [t.ask(q)],
    steps: [call("price_total", { lines: counted.map((l) => ({ item: l.item, price: l.price, per: per(l), count: l.free ? 0 : l.n })) }),
      say(`**${money(total)} €** en tout :\n\n${counted.map((l) => `- ${l.item} : ${l.free ? `offert (dès ${offer.from} jours)` : `${money(l.price)} € × ${l.n} = ${money(l.amount)} €`} (${l.word})`).join("\n")}`)],
    check: ({ answer }) => pass(numbersIn(answer).some((x) => Math.abs(x - total) < 0.001), `${total}`),
  };
}

export const UNIT_FAMILIES = [[totals, 500]];

export function unitTasks(seed, scale) {
  const r = rng(seed);
  return Array.from({ length: Math.round(500 * scale) }, (_, i) => {
    const t = totals(r);
    return { id: `totals-${i}`, tab: "agent", world: t.world, turns: t.turns, check: t.check };
  });
}
