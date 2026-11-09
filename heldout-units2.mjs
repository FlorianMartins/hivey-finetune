// The units, judged: written before any change aimed at them, opened once at the end.
import { createBrowser } from "./sidebar/bench/browser.mjs";
import { numbersIn, pass } from "./sidebar/bench/checks.mjs";

const page = (url, title, text) => createBrowser({ tabs: [url], sites: { [url]: () => ({ title, text }) } });
const has = (answer, n) => numbersIn(answer).some((x) => Math.abs(x - n) < 0.001);

export const HELDOUT = [
  { id: "v-boat", tab: "agent", world: () => page("https://bateaux-lac-bleu.example/tarifs", "Bateaux du Lac Bleu", "Bateau électrique (5 places) : 45 € l'heure.\nCaution : 100 €, rendue au retour.\nGilets : inclus.\nCarburant : sans objet."),
    turns: ["Combien je paie pour 2 bateaux électriques pendant 3 heures, sans compter la caution rendue ?"],
    check: ({ answer }) => pass(has(answer, 270), "270 €") },
  { id: "v-hostel", tab: "agent", world: () => page("https://auberge-dunes.example/prix", "Auberge des Dunes", "Lit en dortoir : 24 € par personne et par nuit.\nPetit-déjeuner : 6 € par personne et par jour.\nLocation de serviette : 3 € par personne, pour tout le séjour.\nFrais de réservation : 2 €, une fois."),
    turns: ["Pour 3 personnes, 2 nuits, avec petit-déjeuner les 2 matins et une serviette chacun, combien en tout ?"],
    // 3×2×24 + 3×2×6 + 3×3 + 2 = 144 + 36 + 9 + 2 = 191.
    check: ({ answer }) => pass(has(answer, 191), "191 €") },
  { id: "v-gym", tab: "agent", world: () => page("https://forme-plus.example/abonnements", "Forme Plus", "Abonnement : 29 € par mois.\nFrais d'inscription : 39 €, une fois.\nBadge : 10 €, une fois.\nCours de yoga : inclus."),
    turns: ["Combien me coûte une année complète à Forme Plus, inscription et badge compris ?"],
    // 12×29 + 39 + 10 = 397.
    check: ({ answer }) => pass(has(answer, 397), "397 €") },
  { id: "v-bike-tour", tab: "agent", world: () => page("https://velo-vignes.example/balade", "Balade à vélo dans les vignes", "Balade guidée : 38 € par adulte, 19 € par enfant.\nVélo électrique en option : 12 € par personne, pour la balade.\nDégustation : 8 € par adulte (interdite aux enfants)."),
    turns: ["2 adultes et 2 enfants, tous en vélo électrique, dégustation pour les adultes : combien ?"],
    // 2×38 + 2×19 + 4×12 + 2×8 = 76 + 38 + 48 + 16 = 178.
    check: ({ answer }) => pass(has(answer, 178), "178 €") },
  { id: "v-storage", tab: "agent", world: () => page("https://box-stock.example/tarifs", "Box Stock", "Box de 5 m² : 69 € par mois.\nCadenas : 15 €, une fois.\nAssurance : 9 € par mois.\nLe premier mois de location est offert (l'assurance reste due)."),
    turns: ["Pour 4 mois de box de 5 m² avec cadenas et assurance, combien au total ?"],
    // 3×69 + 15 + 4×9 = 207 + 15 + 36 = 258.
    check: ({ answer }) => pass(has(answer, 258), "258 €") },
  { id: "v-camp", tab: "agent", world: () => page("https://camping-pins.example/tarifs", "Camping des Pins", "Emplacement : 18 € par nuit.\nAdulte : 7 € par nuit.\nEnfant de moins de 7 ans : gratuit.\nÉlectricité : 4 € par nuit.\nTaxe de séjour : 0,60 € par adulte et par nuit."),
    turns: ["Pour 5 nuits, 2 adultes et un enfant de 4 ans, avec électricité : combien ?"],
    // 5×18 + 2×5×7 + 0 + 5×4 + 2×5×0,60 = 90 + 70 + 20 + 6 = 186.
    check: ({ answer }) => pass(has(answer, 186), "186 €") },
  { id: "v-car-en", tab: "agent", world: () => page("https://moorland-cars.example/rates", "Moorland Car Hire", "Compact car: £38 per day.\nAdditional driver: £9 per day.\nChild seat: £25 per rental.\nFull tank option: £60 per rental."),
    turns: ["5 days, with one additional driver and a child seat, no full tank option: what's the total?"],
    // 5×38 + 5×9 + 25 = 190 + 45 + 25 = 260.
    check: ({ answer }) => pass(has(answer, 260), "£260") },
  { id: "v-print", tab: "agent", world: () => page("https://imprim-express.example/prix", "Imprim Express", "Impression couleur A4 : 0,30 € la page.\nReliure : 4 € par exemplaire.\nFrais de dossier : 5 € par commande."),
    turns: ["J'imprime 10 exemplaires d'un document de 20 pages en couleur, reliés. Combien pour la commande ?"],
    // 10×20×0,30 + 10×4 + 5 = 60 + 40 + 5 = 105.
    check: ({ answer }) => pass(has(answer, 105), "105 €") },
];
