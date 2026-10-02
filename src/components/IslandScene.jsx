// IslandScene.jsx
//
// Conteneur Three.js / @react-three/fiber de la scène principale : une île
// flottante qui héberge les cartes affichées sous forme d'étoiles/objets
// interactifs. Orchestre CameraController (caméra libre) et SkyScene (le ciel
// étoilé).
//
// Props attendues :
//   - cards        : tableau des cartes à représenter dans la scène
//   - visibleCards : sous-ensemble de `cards` à afficher (recherche) ;
//                    toutes les cartes si omis
//   - onStarClick  : callback(id) déclenché au clic sur une étoile/carte

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import CameraController from "./CameraController";
import SkyScene from "./SkyScene";

const BACKGROUND_COLOR = "#0b0a1f";

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

export default function IslandScene({ cards, visibleCards, onStarClick }) {
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Canvas camera={{ position: [0, -2, 18], fov: 60, near: 0.1, far: 500 }}>
        <color attach="background" args={[BACKGROUND_COLOR]} />
        <fog attach="fog" args={[BACKGROUND_COLOR, 30, 80]} />

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
        <CameraController />
      </Canvas>
    </div>
  );
}
