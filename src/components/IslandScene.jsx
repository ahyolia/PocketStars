// IslandScene.jsx
//
// Conteneur Three.js / @react-three/fiber de la scène principale : une île
// flottante sur laquelle le joueur marche à la première personne, sous un
// ciel où les cartes sont représentées par des étoiles interactives.
// Orchestre FloatingIsland (le sol), CameraController (déplacement et
// regard) et SkyScene (le ciel étoilé), et affiche un rappel des commandes
// jusqu'au premier déplacement.
//
// Props attendues :
//   - cards          : tableau des cartes à représenter dans la scène
//   - visibleCards   : sous-ensemble de `cards` à afficher (recherche) ;
//                      toutes les cartes si omis
//   - onStarClick    : callback(id) déclenché au clic sur une étoile/carte
//   - controlsEnabled: false pour bloquer déplacement et regard (ex. pendant
//                      la révélation d'une carte)

import { Suspense, useCallback, useState } from "react";
import { Canvas } from "@react-three/fiber";
import CameraController from "./CameraController";
import FloatingIsland from "./FloatingIsland";
import SkyScene from "./SkyScene";
import { EYE_HEIGHT } from "../constants/world";
import "./IslandScene.css";

const BACKGROUND_COLOR = "#0b0a1f";

export default function IslandScene({
  cards,
  visibleCards,
  onStarClick,
  controlsEnabled = true,
}) {
  const [showHint, setShowHint] = useState(true);
  const hideHint = useCallback(() => setShowHint(false), []);

  return (
    <div className="island-scene">
      <Canvas camera={{ position: [0, EYE_HEIGHT, 14], fov: 70, near: 0.1, far: 500 }}>
        <color attach="background" args={[BACKGROUND_COLOR]} />
        {/* Le brouillard fond l'horizon de l'île dans le ciel. */}
        <fog attach="fog" args={[BACKGROUND_COLOR, 25, 90]} />

        <ambientLight color="#6a6ab8" intensity={1.6} />
        <directionalLight
          color="#8f9cff"
          intensity={2.5}
          position={[-8, 12, 6]}
        />

        <FloatingIsland />
        <Suspense fallback={null}>
          <SkyScene
            cards={cards}
            visibleCards={visibleCards}
            onStarClick={onStarClick}
          />
        </Suspense>
        <CameraController enabled={controlsEnabled} onFirstMove={hideHint} />
      </Canvas>

      <p className={`island-scene__hint${showHint ? "" : " is-hidden"}`}>
        <kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd> ou flèches pour marcher
        <span aria-hidden="true"> · </span>
        souris vers les bords pour regarder autour
        <span aria-hidden="true"> · </span>
        clic sur une étoile pour la révéler
      </p>
    </div>
  );
}
