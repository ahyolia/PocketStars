// companionLines.js
//
// Répliques du compagnon (PokeCompanion) : monologue d'accueil et réactions
// contextuelles au clic sur une étoile et à la révélation d'une carte.
// Une réaction est tirée au hasard parmi les variantes de sa liste.

import { getHoloStrength, ULTRA } from "./rarities";

export const COMPANION_NAME = "Mimikyu";

// Monologue d'accueil, enchaîné réplique par réplique au lancement.
export const INTRO_LINES = [
  `B-bonsoir… Moi, c'est ${COMPANION_NAME}. Non, je ne suis pas un Pikachu… mais c'est gentil d'y avoir pensé !`,
  "Chaque étoile du ciel cache une carte Pokémon…",
  "Promène-toi, et clique sur une étoile pour découvrir sa carte !",
];

export const STAR_CLICK_LINES = [
  "Oh, celle-là brille fort !",
  "Bon choix ! Voyons ce qu'elle cache…",
  "Je croise les doigts… enfin, ce qui me sert de doigts.",
  "Attention, l'étoile descend…",
];

export const ERROR_LINES = [
  "Oups… cette étoile s'est éteinte avant d'arriver. Essaie-en une autre !",
  "Hmm, je n'arrive pas à atteindre cette étoile. Une autre peut-être ?",
];

const ULTRA_LINES = [
  (card) => `Incroyable ! ${card.name}, une ${card.rarity} ! Une étoile comme ça, on n'en voit pas souvent !`,
  (card) => `Waouh… ${card.name} ! Celle-là, je la ferais encadrer !`,
];

const HOLO_LINES = [
  (card) => `Regarde comme ${card.name} scintille ! Une carte holographique !`,
  (card) => `Une holo ! ${card.name} brille encore plus que mon déguisement…`,
];

const CATEGORY_LINES = {
  Trainer: (card) => `${card.name} : une carte Dresseur. Pratique pour préparer un combat !`,
  Energy: (card) => `${card.name} : de l'énergie pure, tombée des étoiles !`,
};

// Selon le premier type de la carte (types TCGdex).
const TYPE_LINES = {
  Fire: (card) => `${card.name} ! Ça chauffe par ici…`,
  Water: (card) => `${card.name} ! Gare aux éclaboussures !`,
  Grass: (card) => `${card.name}, ça sent bon la forêt !`,
  Lightning: (card) => `${card.name} ! Un type Électrik… comme mon costume !`,
  Psychic: (card) => `${card.name}… une énergie Psy. Ça me donne des frissons sous mon costume.`,
  Fighting: (card) => `${card.name} ! Un vrai combattant, celui-là.`,
  Darkness: (card) => `${card.name}… parfait pour une nuit étoilée.`,
  Metal: (card) => `${card.name} ! Solide comme l'acier.`,
  Dragon: (card) => `${card.name} ! Un dragon, rien que ça !`,
  Fairy: (card) => `${card.name} ! Un type Fée, comme moi… on va bien s'entendre.`,
  Colorless: (card) => `${card.name} ! Simple, mais efficace.`,
};

const GENERIC_LINES = [
  (card) => `Tiens, ${card.name} ! Une jolie trouvaille.`,
  (card) => `${card.name} ! Je me demandais quelle carte se cachait là.`,
];

export function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Réaction à la révélation d'une carte, du plus marquant au plus général :
// rareté, catégorie (Dresseur, Énergie), type, puis réplique générique.
export function getRevealLine(card) {
  const holo = getHoloStrength(card.rarity);
  if (holo >= ULTRA) return pickRandom(ULTRA_LINES)(card);
  if (holo > 0) return pickRandom(HOLO_LINES)(card);
  const byCategory = CATEGORY_LINES[card.category];
  if (byCategory) return byCategory(card);
  const byType = TYPE_LINES[card.types?.[0]];
  if (byType) return byType(card);
  return pickRandom(GENERIC_LINES)(card);
}
