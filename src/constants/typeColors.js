// typeColors.js
//
// Correspondance type TCGdex → ambiance du ciel, utilisée par SkyAtmosphere.
// Chaque entrée définit :
//   - sky   : couleur de fond (et du brouillard), volontairement très sombre
//             pour garder l'ambiance nocturne/cosmique
//   - light : teinte de la lumière ambiante, plus saturée, qui colore l'île
//             et les étoiles
//
// Les noms de types sont ceux de TCGdex (en anglais) : "Lightning" et non
// "Electric", et pas de type Spectre dans le TCG (ces Pokémon sont Psychic).

export const NEUTRAL_ATMOSPHERE = { sky: "#0b0a1f", light: "#6a6ab8" };

export const TYPE_ATMOSPHERES = {
  Grass: { sky: "#0a1f16", light: "#5fbf7a" },
  Fire: { sky: "#2a1008", light: "#ff8a3d" },
  Water: { sky: "#081a33", light: "#4a9dff" },
  Lightning: { sky: "#241f06", light: "#ffd83d" },
  Psychic: { sky: "#26082a", light: "#e05cd6" },
  Fighting: { sky: "#24120a", light: "#c9784a" },
  Darkness: { sky: "#050509", light: "#4b4a7a" },
  Metal: { sky: "#141a20", light: "#a9b8c8" },
  Fairy: { sky: "#2a1424", light: "#ffaad8" },
  Dragon: { sky: "#1c180a", light: "#c9a24a" },
  Colorless: { sky: "#1a1a22", light: "#d8d8e6" },
};

// Ambiance correspondant au premier type de la carte, ou neutre si la carte
// est absente, sans type (Dresseur, Énergie) ou d'un type inconnu.
export function getAtmosphere(card) {
  return TYPE_ATMOSPHERES[card?.types?.[0]] ?? NEUTRAL_ATMOSPHERE;
}
