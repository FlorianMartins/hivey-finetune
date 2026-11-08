// Totals where the unit of each price decides: per day, per night, per person, per rental, once.
// Written before any change aimed at them; heldout3's bike rental (seen) is not among them.

import { createBrowser } from "./sidebar/bench/browser.mjs";
import { numbersIn, pass } from "./sidebar/bench/checks.mjs";

const page = (url, title, text) => createBrowser({ tabs: [url], sites: { [url]: () => ({ title, text }) } });
const has = (answer, n) => numbersIn(answer).some((x) => Math.abs(x - n) < 0.001);

export const HELDOUT = [
  { id: "u-kayak", tab: "agent", world: () => page("https://kayak-verdon.example/tarifs", "Tarifs — Kayak Verdon", "Location de kayak biplace : 28 € la demi-journée.\nGilet de sauvetage : 2 € par personne, pour toute la location.\nNavette retour : 6 € par personne."),
    turns: ["Combien pour 2 kayaks biplaces pendant 3 demi-journées, pour 4 personnes, gilets et navette retour compris ?"],
    // 2 × 3 × 28 + 4 × 2 + 4 × 6 = 168 + 8 + 24 = 200.
    check: ({ answer }) => pass(has(answer, 200), "200 €") },
  { id: "u-gite", tab: "agent", world: () => page("https://gite-sources.example/prix", "Prix — Gîte des Sources", "Nuitée : 85 € pour le gîte (jusqu'à 6 personnes).\nFrais de ménage : 45 €, une fois par séjour.\nTaxe de séjour : 1,20 € par adulte et par nuit.\nDraps : 9 € par lit, pour le séjour."),
    turns: ["Pour 4 nuits avec 3 adultes, 2 enfants et 3 lits faits, ça fait combien au total ?"],
    // 4 × 85 + 45 + 3 × 4 × 1,20 + 3 × 9 = 340 + 45 + 14,40 + 27 = 426,40.
    check: ({ answer }) => pass(has(answer, 426.4), "426,40 €") },
  { id: "u-parking", tab: "agent", world: () => page("https://parking-gare-ouest.example/tarifs", "Tarifs — Parking Gare Ouest", "Première heure : 3 €.\nHeures suivantes : 1,50 € l'heure.\nForfait 24 h : 18 €.\nBadge d'accès : 5 €, payé une seule fois, remboursé au retour."),
    turns: ["Je laisse ma voiture 6 heures au parking Gare Ouest. Combien je paie, sans compter le badge remboursé ?"],
    // 3 + 5 × 1,50 = 10,50 (under the 24 h flat rate).
    check: ({ answer }) => pass(has(answer, 10.5), "10,50 €") },
  { id: "u-climbing", tab: "agent", world: () => page("https://salle-bloc-azur.example/tarifs", "Tarifs — Bloc Azur", "Entrée adulte : 14 €.\nEntrée enfant (moins de 14 ans) : 9 €.\nLocation chaussons : 4 € la paire, par séance.\nCarte de membre : 20 € par an, donne -3 € sur chaque entrée adulte."),
    turns: ["On vient 2 adultes et 1 enfant, une fois, tous avec chaussons de location, sans carte de membre. Combien ?"],
    // 2 × 14 + 9 + 3 × 4 = 28 + 9 + 12 = 49.
    check: ({ answer }) => pass(has(answer, 49), "49 €") },
  { id: "u-van", tab: "agent", world: () => page("https://vans-libres.example/offre", "Location de van — Vans Libres", "Van aménagé : 95 € par jour.\nKilométrage : 300 km inclus pour toute la location, puis 0,25 € par km.\nKit vaisselle : 15 € par location.\nAssurance tous risques : 18 € par jour."),
    turns: ["Pour 4 jours et 500 km, avec le kit vaisselle et l'assurance tous risques, combien en tout ?"],
    // 4 × 95 + (500 − 300) × 0,25 + 15 + 4 × 18 = 380 + 50 + 15 + 72 = 517.
    check: ({ answer }) => pass(has(answer, 517), "517 €") },
  { id: "u-course", tab: "agent", world: () => page("https://ecole-poterie.example/stage", "Stage — École de poterie", "Stage de 5 séances : 180 € par personne.\nMatériel : 25 € par personne, une fois pour le stage.\nCuisson des pièces : 3 € par pièce."),
    turns: ["Nous sommes 2 à faire le stage, et nous cuirons 7 pièces en tout. Combien au total ?"],
    // 2 × 180 + 2 × 25 + 7 × 3 = 360 + 50 + 21 = 431.
    check: ({ answer }) => pass(has(answer, 431), "431 €") },
  { id: "u-ski-en", tab: "agent", world: () => page("https://glenmoor-snow.example/prices", "Prices — Glenmoor Snow", "Lift pass: £42 per day.\nSki and boot hire: £26 per day.\nHelmet: £8 for the whole hire.\nLesson: £55 per lesson."),
    turns: ["For 3 days, 2 people, each with lift pass, skis and a helmet, and one lesson each, what is the total?"],
    // 2 × 3 × 42 + 2 × 3 × 26 + 2 × 8 + 2 × 55 = 252 + 156 + 16 + 110 = 534.
    check: ({ answer }) => pass(has(answer, 534), "£534") },
  { id: "u-delivery", tab: "agent", world: () => page("https://primeur-ferme.example/panier", "Panier — Primeur de la Ferme", "Panier de légumes : 19 € par semaine.\nLivraison : 4 € par livraison, une livraison par semaine, offerte dès 4 semaines d'abonnement.\nFrais d'inscription : 10 €, une fois."),
    turns: ["Si je m'abonne pour 6 semaines, combien je paie en tout ?"],
    // 6 × 19 + 0 + 10 = 124 (delivery free from 4 weeks).
    check: ({ answer }) => pass(has(answer, 124), "124 €") },
];
