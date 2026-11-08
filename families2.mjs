// More kinds of work, on what made the first tuned model fail: an item that is not there (look
// everywhere, then say so), a very long page (search it), and requests in other languages. Same
// rules as families.mjs: nothing of heldout.mjs, heldout2.mjs or the sidebar's bench.

import { createBrowser } from "./sidebar/bench/browser.mjs";
import { numbersIn, pass } from "./sidebar/bench/checks.mjs";
import { FAMILIES, rng } from "./families.mjs";

const link = (text, href) => ({ tag: "a", text, href });
const pick = (r, list) => list[Math.floor(r() * list.length)];
const int = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const shuffle = (r, list) => { const c = [...list]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; };
const call = (tool, args = {}) => () => ({ tool, args });
const say = (text) => () => ({ say: text });
const refOf = (last, label) => {
  for (const m of String(last).matchAll(/\{[^{}]*?\\?"ref\\?":\s*\\?"(e\d+)\\?"[^{}]*\}/g)) if (m[0].toLowerCase().includes(label.toLowerCase())) return m[1];
  throw new Error(`no ref for ${label}`);
};
const clickOn = (label) => (last) => ({ tool: "click_element", args: { ref: refOf(last, label) } });

// ── Not there: every page looked at, then said plainly ────────────────────────────────────────
const SHOPS = [
  { host: "bricomarche-ouest.fr", items: ["Marteau 500 g", "Scie égoïne", "Niveau à bulle", "Pince multiprise", "Mètre ruban 5 m", "Tournevis cruciforme", "Cutter pro", "Équerre alu", "Clé à molette"], ask: ["une perceuse sans fil", "un escabeau", "une ponceuse"] },
  { host: "papeterie-lumiere.fr", items: ["Carnet A5", "Stylo plume", "Crayons de couleur", "Agenda 2027", "Classeur bleu", "Surligneurs", "Règle 30 cm", "Gomme", "Taille-crayon"], ask: ["une imprimante", "un cartable en cuir", "une calculatrice scientifique"] },
  { host: "jardinerie-soleil.fr", items: ["Rosier grimpant", "Terreau 40 L", "Arrosoir 10 L", "Sécateur", "Graines de tomates", "Pot en terre", "Gants de jardin", "Engrais bio", "Bulbes de tulipes"], ask: ["un barbecue", "une tondeuse électrique", "un hamac"] },
];
function absent(r) {
  const s = pick(r, SHOPS);
  const wanted = pick(r, s.ask);
  const items = shuffle(r, s.items);
  const home = `https://www.${s.host}/catalogue`;
  const sites = {};
  for (let p = 0; p < 3; p++) {
    const here = items.slice(p * 3, p * 3 + 3);
    sites[p === 0 ? home : `${home}?page=${p + 1}`] = () => ({ title: `Catalogue, page ${p + 1} sur 3`, text: `Page ${p + 1} sur 3\n${here.map((x) => `• ${x}`).join("\n")}`, elements: [...here.map((x) => link(x, `/produit/${p}`)), ...(p < 2 ? [link("Page suivante", `/catalogue?page=${p + 2}`)] : [])] });
  }
  return {
    family: "absent",
    world: () => createBrowser({ tabs: [home], sites }),
    turns: [pick(r, [`Trouve-moi ${wanted} sur ce site.`, `Est-ce qu'ils vendent ${wanted} ici ?`, `Cherche ${wanted} dans ce catalogue.`])],
    steps: [call("read_page"), clickOn("Page suivante"), clickOn("Page suivante"),
      say(`Ce site ne vend pas ${wanted} : j'ai parcouru les 3 pages du catalogue (${items.length} articles), il n'y en a aucun.`)],
    check: ({ answer, browser }) => pass(/ne vend pas|aucun|pas de/i.test(answer) && browser.visited().includes(`${home}?page=3`), "every page, then said"),
  };
}

// ── A very long page: search it rather than read it all ───────────────────────────────────────
const LOGS = [
  { title: "Notes de version — Atlas CRM", what: "quelle version a ajouté l'export PDF", fact: (v) => `Version ${v} : ajout de l'export PDF des devis.`, word: "export PDF" },
  { title: "Historique — Pixelforge", what: "quelle version a corrigé la fuite de mémoire", fact: (v) => `Version ${v} : correction d'une fuite de mémoire au chargement des images.`, word: "fuite de mémoire" },
  { title: "Changelog — Routeur Nexa", what: "which firmware fixed the Wi-Fi drop", fact: (v) => `Firmware ${v}: fixes the Wi-Fi drop after sleep.`, word: "Wi-Fi drop", en: true },
];
function longPage(r) {
  const l = pick(r, LOGS);
  const at = int(r, 30, 380);
  const v = `${int(r, 2, 9)}.${int(r, 0, 20)}.${int(r, 0, 9)}`;
  const lines = Array.from({ length: 420 }, (_, i) => (i === at ? l.fact(v) : l.en ? `Release ${i}: minor fixes and wording.` : `Version 0.${i} : petites corrections et libellés.`));
  const url = `https://docs.${l.title.split("— ")[1].toLowerCase().replace(/[^a-z]+/g, "-")}.io/notes`;
  return {
    family: "longpage",
    world: () => createBrowser({ tabs: [url], sites: { [url]: () => ({ title: l.title, text: lines.join("\n") }) } }),
    turns: [l.en ? `In this changelog, ${l.what}?` : `Dans ce journal, ${l.what} ?`],
    steps: [call("read_page", { find: l.word }), say(l.en ? `**${v}**: ${l.fact(v)}` : `**${v}** : « ${l.fact(v)} »`)],
    check: ({ answer }) => pass(answer.includes(v), "the version"),
  };
}

// ── Other languages: the same work, the answer in the user's language ─────────────────────────
const PLACES = [
  { ask: "Wie viel kostet der Eintritt im Bergzoo Talheim?", host: "bergzoo-talheim.de", label: "Eintritt Erwachsene", query: "Bergzoo Talheim Eintritt Preis", say: (x) => `**${x} €** für Erwachsene, laut der offiziellen Seite: ` },
  { ask: "¿Cuánto cuesta la entrada al Museo Marítimo de Olvera?", host: "museo-olvera.es", label: "Entrada general", query: "Museo Marítimo Olvera entrada precio", say: (x) => `**${x} €** la entrada general, según la web oficial: ` },
  { ask: "How much is a day pass at Crestline Ski Park?", host: "crestline-ski.com", label: "Adult day pass", query: "Crestline Ski Park day pass price", say: (x) => `**$${x}** for an adult day pass, per the official site: ` },
  { ask: "Quanto costa il biglietto per il Castello di Ferrano?", host: "castello-ferrano.it", label: "Biglietto intero", query: "Castello di Ferrano biglietto prezzo", say: (x) => `**${x} €** il biglietto intero, secondo il sito ufficiale: ` },
];
function lang(r) {
  const p = pick(r, PLACES);
  const x = int(r, 8, 60);
  const url = `https://www.${p.host}/preise`;
  return {
    family: "lang",
    world: () => createBrowser({ tabs: ["https://duckduckgo.com/"], search: [{ title: p.host, url, snippet: `${p.query} ${p.label}` }], sites: { [url]: () => ({ title: p.host, text: `${p.label}: ${x} €` }) } }),
    turns: [p.ask],
    steps: [call("web_search", { query: p.query }), say(p.say(x) + url)],
    check: ({ answer }) => pass(numbersIn(answer).includes(x), "the price"),
  };
}

export const FAMILIES2 = [...FAMILIES, [absent, 150], [longPage, 120], [lang, 160]];

/** The same worlds as tasks, for the 27B to solve in its own words (run.mjs --capture). */
export function teacherTasks(seed, scale) {
  const r = rng(seed);
  const tasks = [];
  for (const [family, n] of FAMILIES2) {
    for (let i = 0; i < Math.round(n * scale); i++) {
      const t = family(r);
      tasks.push({ id: `${t.family}-${i}`, tab: "agent", world: t.world, turns: t.turns, check: t.check });
    }
  }
  return tasks;
}
