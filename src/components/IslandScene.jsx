// IslandScene.jsx
//
// Conteneur Three.js / @react-three/fiber de la scène principale : une île
// flottante qui héberge les cartes affichées sous forme d'étoiles/objets
// interactifs. Orchestre CameraController (caméra libre), SkyScene (le ciel
// étoilé) et SkyAtmosphere (fond, brouillard et lumière ambiante selon le
// type de la carte sélectionnée).
//
// Props attendues :
//   - cards        : tableau des cartes à représenter dans la scène
//   - selectedCard : carte actuellement révélée (ou null)
//   - onStarClick  : callback(id) déclenché au clic sur une étoile/carte

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import CameraController from "./CameraController";
import SkyAtmosphere from "./SkyAtmosphere";
import SkyScene from "./SkyScene";

function FloatingIsland() {
  return (
    <group>
      {/* Plateau supérieur */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[6, 5.5, 1, 48]} />
        <meshStandardMaterial color="#5a6c94" roughness={0.9} />
      </mesh>
      {/* Base rocheuse en cône inversé */}
      <mesh position={[0, -2.5, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[5.5, 4, 48]} />
        <meshStandardMaterial color="#4a3d6e" roughness={1} />
      </mesh>
    </group>
  );
}

export default function IslandScene({ cards, selectedCard, onStarClick }) {
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Canvas camera={{ position: [0, -2, 18], fov: 60, near: 0.1, far: 500 }}>
        <SkyAtmosphere selectedCard={selectedCard} />
        <directionalLight
          color="#8f9cff"
          intensity={2.5}
          position={[-8, 12, 6]}
        />

        <FloatingIsland />
        <Suspense fallback={null}>
          <SkyScene cards={cards} onStarClick={onStarClick} />
        </Suspense>
        <CameraController />
      </Canvas>
    </div>
  );
}
