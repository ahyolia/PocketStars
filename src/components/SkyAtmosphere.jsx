// SkyAtmosphere.jsx
//
// Fait varier l'ambiance du ciel (couleur de fond / brouillard / lumière
// ambiante) selon le type du Pokémon de la carte sélectionnée, par
// interpolation légère (lerp de couleur à chaque frame) plutôt qu'un recalcul
// de shader coûteux. Revient à l'ambiance neutre quand la carte est fermée.
//
// Ce composant possède le fond, le brouillard et la lumière ambiante de la
// scène : il doit être rendu à l'intérieur du Canvas d'IslandScene.
//
// Props attendues :
//   - selectedCard : carte actuellement sélectionnée (ou null). On y lit
//                    `selectedCard.types[0]` pour déterminer l'ambiance cible.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, MathUtils } from "three";
import { NEUTRAL_ATMOSPHERE, getAtmosphere } from "../constants/typeColors";

// Vitesse de convergence de l'interpolation exponentielle : ~95 % du chemin
// parcouru en 3 / TRANSITION_SPEED secondes (ici ~0,6 s).
const TRANSITION_SPEED = 5;

const NEUTRAL_LIGHT_INTENSITY = 1.6;
const TYPED_LIGHT_INTENSITY = 2.2;

const FOG_NEAR = 30;
const FOG_FAR = 80;

export default function SkyAtmosphere({ selectedCard }) {
  const backgroundRef = useRef();
  const fogRef = useRef();
  const ambientRef = useRef();

  const atmosphere = getAtmosphere(selectedCard);
  const target = useMemo(
    () => ({
      sky: new Color(atmosphere.sky),
      light: new Color(atmosphere.light),
      intensity:
        atmosphere === NEUTRAL_ATMOSPHERE
          ? NEUTRAL_LIGHT_INTENSITY
          : TYPED_LIGHT_INTENSITY,
    }),
    [atmosphere]
  );

  useFrame((_, delta) => {
    // Facteur indépendant du framerate.
    const t = 1 - Math.exp(-TRANSITION_SPEED * delta);
    backgroundRef.current.lerp(target.sky, t);
    fogRef.current.color.lerp(target.sky, t);
    ambientRef.current.color.lerp(target.light, t);
    ambientRef.current.intensity = MathUtils.lerp(
      ambientRef.current.intensity,
      target.intensity,
      t
    );
  });

  return (
    <>
      <color ref={backgroundRef} attach="background" args={[NEUTRAL_ATMOSPHERE.sky]} />
      <fog ref={fogRef} attach="fog" args={[NEUTRAL_ATMOSPHERE.sky, FOG_NEAR, FOG_FAR]} />
      <ambientLight
        ref={ambientRef}
        color={NEUTRAL_ATMOSPHERE.light}
        intensity={NEUTRAL_LIGHT_INTENSITY}
      />
    </>
  );
}
