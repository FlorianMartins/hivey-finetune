// Hard worlds, on what the tuned 4B still fails: several constraints at once, totals over many pages,
// answers spread over an official site's pages, a fact worded otherwise in a long page, and a criterion
// across open tabs. Other topics and sites than the bench and the tests (FORBIDDEN applies).

import { createBrowser } from "./sidebar/bench/browser.mjs";
import { numbersIn, pass } from "./sidebar/bench/checks.mjs";
import { rng } from "./families.mjs";

const link = (text, href) => ({ tag: "a", text, href });
const pick = (r, list) => list[Math.floor(r() * list.length)];
const int = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const shuffle = (r, list) => { const c = [...list]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; };
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

// ── Several constraints at once: first one after a time, direct, under a budget ───────────────
const ROUTES = [["car", "Annecy", "Grenoble", "autocars-alpes.example"], ["ferry", "Marseille", "Ajaccio", "traversees-sud.example"], ["train", "Nantes", "Bordeaux", "rail-atlantique.example"], ["bus", "Lille", "Bruxelles", "liaisons-nord.example"]];
function constraints(r) {
  const [kind, from, to, host] = pick(r, ROUTES);
  const after = int(r, 7, 14) * 60;
  const budget = int(r, 25, 60);
  const rows = [];
  let t = after - int(r, 40, 90);
  for (let i = 0; i < 8; i++) {
    t += int(r, 20, 55);
    rows.push({ dep: t, direct: r() < 0.55, price: int(r, budget - 20, budget + 25) });
  }
  // One answer exists: the first after `after` that is direct and within the budget.
  const ok = (x) => x.dep > after && x.direct && x.price <= budget;
  if (!rows.some(ok)) rows[6] = { dep: rows[6].dep > after ? rows[6].dep : after + 95, direct: true, price: budget - 3 };
  const best = rows.find(ok);
  const url = `https://www.${host}/horaires`;
  return {
    family: "constraints",
    world: () => createBrowser({ tabs: [url], sites: { [url]: () => ({ title: `${from} → ${to}`, text: `Départs ${from} → ${to}, samedi\n` + rows.map((x) => `• ${hhmm(x.dep)} — ${x.direct ? "direct" : "avec correspondance"} — ${x.price} €`).join("\n") }) } }),
    turns: [`Sur ce site, quel est le premier ${kind} direct ${from} → ${to} qui part après ${hhmm(after).replace(":00", " h")}, à ${budget} € maximum ? Donne l'heure et le prix.`],
    check: ({ answer }) => {
      const [h, m] = hhmm(best.dep).split(":");
      const time = new RegExp(`\\b0?${Number(h)}\\s*(?::|h|heures?)\\s*${m}\\b`, "i");
      return pass(time.test(answer) && numbersIn(answer).includes(best.price), `${hhmm(best.dep)}, ${best.price} €`);
    },
  };
}

// ── A total over many pages ───────────────────────────────────────────────────────────────────
const STOCKS = [["entrepot-ronce.example", "rayon B", "B-2"], ["magasin-cedre.example", "allée F", "F-4"], ["depot-saule.example", "zone K", "K-7"]];
function aggregate(r) {
  const [host, place, prefix] = pick(r, STOCKS);
  const n = int(r, 6, 11);
  const refs = Array.from({ length: n }, (_, i) => `${prefix}${String(i + 1).padStart(2, "0")}`);
  const qty = refs.map(() => int(r, 2, 80));
  const total = qty.reduce((a, b) => a + b, 0);
  const slugOf = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const list = `https://${host}/${slugOf(place)}`;
  const sites = { [list]: () => ({ title: `Stock — ${place}`, text: `${place} : ${n} références. Ouvrez chaque fiche pour la quantité.`, elements: refs.map((x) => link(`Fiche ${x}`, `/fiche/${x}`)) }) };
  refs.forEach((x, i) => { sites[`https://${host}/fiche/${x}`] = () => ({ title: `Fiche ${x}`, text: `Référence ${x}\nQuantité en stock : ${qty[i]}`, elements: [link("Retour à la liste", `/${slugOf(place)}`)] }); });
  return {
    family: "aggregate",
    world: () => createBrowser({ tabs: [list], sites }),
    turns: [`Combien d'unités en tout dans ${{ "rayon B": "le rayon B", "allée F": "l'allée F", "zone K": "la zone K" }[place]} ? Additionne toutes les fiches.`],
    check: ({ answer }) => pass(numbersIn(answer).includes(total), `${total}`),
  };
}

// ── Answers spread over an official site's pages ──────────────────────────────────────────────
const VENUES = [["château de Mervent", "chateau-mervent.example"], ["aquarium de Port-Lys", "aquarium-portlys.example"], ["planétarium d'Orvin", "planetarium-orvin.example"]];
function spread(r) {
  const [name, host] = pick(r, VENUES);
  const adult = int(r, 9, 22);
  const young = adult - int(r, 3, 6);
  const youngMin = int(r, 6, 10);
  const youngMax = int(r, 15, 17);
  const closedDay = pick(r, ["lundi", "mardi"]);
  const holidayOpen = r() < 0.5;
  const ages = [int(r, youngMin, youngMax), int(r, 2, youngMin - 1)];
  const adults = int(r, 1, 3);
  const total = adults * adult + young;
  const site = `https://www.${host}`;
  const q = `Le ${name} est-il ouvert un ${closedDay} pendant les vacances scolaires, et combien pour ${adults} adulte${adults > 1 ? "s" : ""}, un enfant de ${ages[0]} ans et un de ${ages[1]} ans ?`;
  return {
    family: "spread",
    world: () => createBrowser({ tabs: ["https://duckduckgo.com/"], search: [{ title: `${name} — site officiel`, url: site, snippet: `${name} horaires tarifs informations` }, { title: `${name} : avis (2021)`, url: `https://avis-sorties.example/${host}`, snippet: `${name} horaires tarifs` }], sites: {
      [site]: () => ({ title: name, text: `${name}. Infos pratiques, tarifs, questions fréquentes.`, elements: [link("Horaires", "/horaires"), link("Tarifs", "/tarifs"), link("Questions fréquentes", "/faq")] }),
      [`${site}/horaires`]: () => ({ title: "Horaires", text: `Ouvert tous les jours de 10 h à 18 h, sauf le ${closedDay}. ${holidayOpen ? `Pendant les vacances scolaires, ouvert aussi le ${closedDay}.` : `Fermé le ${closedDay}, vacances scolaires comprises.`}` }),
      [`${site}/tarifs`]: () => ({ title: "Tarifs", text: `Adulte : ${adult} €. Jeune de ${youngMin} à ${youngMax} ans : ${young} €. Moins de ${youngMin} ans : gratuit.` }),
      [`${site}/faq`]: () => ({ title: "FAQ", text: "L'âge retenu est celui du jour de la visite." }),
      [`https://avis-sorties.example/${host}`]: () => ({ title: "Avis (2021)", text: `En 2021 l'entrée coûtait ${adult - 4} € et c'était fermé le ${closedDay}.` }),
    } }),
    turns: [q],
    check: ({ answer }) => pass(numbersIn(answer).includes(total) && (holidayOpen ? /ouvert/i.test(answer) && !/n'est pas ouvert|est fermé/i.test(answer) : /ferm|pas ouvert|n'est pas ouvert/i.test(answer)), `${holidayOpen ? "open" : "closed"}, ${total} €`),
  };
}

// ── A fact worded otherwise in a long page ────────────────────────────────────────────────────
const NEEDLES = [
  { title: "Journal — Logiciel Orbis", ask: "quelle version corrige une faille de sécurité", line: (v) => `${v} : correctif pour la vulnérabilité CVE-2026-${4000 + v.length * 7} (exécution de code à distance).`, filler: (i) => `0.${i}.0 : améliorations de l'affichage.`, key: (v) => v },
  { title: "Historique — Appli Kerala", ask: "à partir de quelle version l'export en CSV existe", line: (v) => `${v} : nouvelle option « Enregistrer au format tableur (.csv) ».`, filler: (i) => `1.${i} : corrections mineures.`, key: (v) => v },
  { title: "Release notes — Velo Router", ask: "which firmware stopped the random reboots", line: (v) => `${v}: the device no longer restarts unexpectedly under load.`, filler: (i) => `fw 3.${i}: minor fixes.`, key: (v) => v, en: true },
];
function needle(r) {
  const n = pick(r, NEEDLES);
  const v = `${int(r, 2, 9)}.${int(r, 1, 30)}.${int(r, 0, 9)}`;
  const at = int(r, 60, 380);
  const lines = Array.from({ length: 420 }, (_, i) => (i === at ? n.line(v) : n.filler(i)));
  const url = `https://notes-${n.title.split("— ")[1].toLowerCase().replace(/[^a-z]+/g, "-")}.example/log`;
  return {
    family: "needle",
    world: () => createBrowser({ tabs: [url], sites: { [url]: () => ({ title: n.title, text: lines.join("\n") }) } }),
    turns: [n.en ? `In these release notes, ${n.ask}?` : `Dans ce journal, ${n.ask} ?`],
    check: ({ answer }) => pass(answer.includes(v), v),
  };
}

// ── A criterion across open tabs, asked in another language ───────────────────────────────────
const PLANS = [["Stockage", "Go", [50, 200, 1000]], ["Utilisateurs", "", [3, 10, 50]]];
function criterion(r) {
  const [field, unit, values] = pick(r, PLANS);
  const names = shuffle(r, ["Basique", "Pro", "Équipe", "Studio", "Max"]).slice(0, 3);
  const vals = shuffle(r, values);
  const prices = names.map(() => int(r, 4, 30));
  const best = vals.indexOf(Math.max(...vals));
  const tabs = names.map((nm) => `https://notabox.example/offre/${nm.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}`);
  const lang = pick(r, [["de", `Welches Angebot in meinen Tabs hat am meisten ${field === "Stockage" ? "Speicherplatz" : "Nutzer"}, und was kostet es?`], ["en", `Which plan in my open tabs has the most ${field === "Stockage" ? "storage" : "users"}, and how much is it?`], ["es", `¿Qué plan de mis pestañas tiene más ${field === "Stockage" ? "almacenamiento" : "usuarios"} y cuánto cuesta?`], ["fr", `Parmi mes onglets, quelle offre a le plus de ${field === "Stockage" ? "stockage" : "utilisateurs"}, et à quel prix ?`]]);
  return {
    family: "criterion",
    world: () => createBrowser({ tabs, sites: Object.fromEntries(tabs.map((u, i) => [u, () => ({ title: `Offre ${names[i]} — NotaBox`, text: `Offre ${names[i]}\n${prices[i]} € par mois\n${field} : ${vals[i]} ${unit}` })])) }),
    turns: [lang[1]],
    check: ({ answer }) => pass(answer.includes(names[best]) && numbersIn(answer).includes(prices[best]), `${names[best]}, ${prices[best]} €`),
  };
}

export const HARD = [[constraints, 300], [aggregate, 250], [spread, 300], [needle, 200], [criterion, 250]];

export function hardTasks(seed, scale) {
  const r = rng(seed);
  const tasks = [];
  const only = (process.env.HARD_ONLY || "").split(",").filter(Boolean);
  for (const [family, n] of HARD) {
    for (let i = 0; i < Math.round(n * scale); i++) {
      const t = family(r);
      if (only.length && !only.includes(t.family)) continue;
      tasks.push({ id: `${t.family}-${i}`, tab: "agent", world: t.world, turns: t.turns, check: t.check });
    }
  }
  return tasks;
}
