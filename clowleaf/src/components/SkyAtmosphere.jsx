// SkyAtmosphere.jsx
//
// Fait varier l'ambiance du ciel (couleur de fond / lumière ambiante) selon
// le type du Pokémon de la carte sélectionnée, par interpolation légère
// (lerp de couleur) plutôt qu'un recalcul de shader coûteux à chaque frame.
//
// Props attendues :
//   - selectedCard : carte actuellement sélectionnée (ou undefined). On y
//                    lit `selectedCard.types` pour déterminer la couleur
//                    cible de l'ambiance.

export default function SkyAtmosphere({ selectedCard }) {
  // TODO: mapper selectedCard?.types vers une couleur cible, puis
  // interpoler progressivement (useFrame + lerp) la couleur de fond/lumière
  // ambiante de la scène vers cette cible.
  return null;
}
