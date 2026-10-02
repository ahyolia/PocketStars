// rarities.js
//
// Intensité de l'effet holographique selon la rareté TCGdex (liste complète :
// https://api.tcgdex.net/v2/en/rarities).
//   - 0 : pas d'effet (communes, peu communes, "Rare" simple — non holo dans
//         le jeu réel —, promos, 1 et 2 losanges de TCG Pocket)
//   - HOLO : cartes holographiques classiques
//   - ULTRA : raretés supérieures (ultra, secrètes, illustrations, shiny…),
//             effet plus marqué et plus d'étincelles

export const HOLO = 0.7;
export const ULTRA = 1;

const NON_HOLO = new Set([
  "Common",
  "Uncommon",
  "Rare",
  "None",
  "Promo",
  "One Diamond",
  "Two Diamond",
]);

const HOLO_RARITIES = new Set([
  "Holo Rare",
  "Rare Holo",
  "Holo Rare V",
  "Holo Rare VMAX",
  "Holo Rare VSTAR",
  "Rare Holo LV.X",
  "Rare PRIME",
  "Three Diamond",
  "Double rare",
  "Classic Collection",
  "ACE SPEC Rare",
  "Black White Rare",
  "Futuristic Rare",
  "Full Art Trainer",
  "LEGEND",
  "Pikachu Rare",
]);

// Renvoie l'intensité de l'effet holo (0 si aucun). Une rareté inconnue est
// traitée comme ultra si son nom contient un mot-clé de rareté supérieure,
// sinon sans effet.
export function getHoloStrength(rarity) {
  if (!rarity || NON_HOLO.has(rarity)) return 0;
  if (HOLO_RARITIES.has(rarity)) return HOLO;
  if (/ultra|secret|hyper|illustration|shiny|crown|star|amazing|radiant|four diamond/i.test(rarity)) {
    return ULTRA;
  }
  return 0;
}
