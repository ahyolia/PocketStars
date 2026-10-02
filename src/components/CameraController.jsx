// CameraController.jsx
//
// Caméra libre pour la scène (OrbitControls de @react-three/drei). Pas de
// logique d'avatar ni de déplacement de personnage pour l'instant :
// uniquement le contrôle de la caméra par l'utilisateur (orbite/zoom/pan).
//
// La position initiale de la caméra est définie par le Canvas d'IslandScene ;
// ce composant ne fait que viser le centre de l'île et activer les contrôles.
//
// À utiliser à l'intérieur du Canvas r3f orchestré par IslandScene.

import { OrbitControls } from "@react-three/drei";

// Point visé : légèrement au-dessus de l'île, pour que le ciel étoilé
// occupe la majorité du cadre en contre-plongée.
const TARGET = [0, 4, 0];

export default function CameraController() {
  return (
    <OrbitControls
      makeDefault
      target={TARGET}
      enableDamping
      dampingFactor={0.08}
      enablePan
      enableZoom
      enableRotate
    />
  );
}
