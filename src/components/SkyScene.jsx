// SkyScene.jsx
//
// Ciel étoilé au-dessus de l'île : chaque carte est représentée par une
// étoile générique (modèle 3D public/models/Star…glb), sans aucun indice
// visuel sur son identité. Le clic sur une étoile déclenche
// onStarClick(card.id).
//
// Props attendues :
//   - cards       : tableau de cartes { id, localId, name }
//   - onStarClick : callback(id) déclenché au clic sur une étoile
//
// Les positions sont tirées aléatoirement dans une coque hémisphérique
// au-dessus de l'île, et mémoïsées sur `cards` : elles restent stables entre
// les re-renders et ne sont recalculées que lorsque la liste change (shuffle).

import { useMemo, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { Matrix4, Vector3 } from "three";

// Modèle 3D : "Star" by J-Toastie [CC-BY 3.0] via Poly Pizza
// https://poly.pizza/m/CeJcPl217O
const STAR_MODEL_URL = encodeURI("/models/Star by J-Toastie - CeJcPl217O.glb");

const MIN_RADIUS = 10;
const MAX_RADIUS = 22;
const MIN_HEIGHT = 3;

// Taille (plus grande dimension) d'une étoile dans la scène.
const STAR_SIZE = 0.7;

const STAR_COLOR = "#f5d94a";
const STAR_HOVER_COLOR = "#fff3b0";

// Extrait la géométrie du modèle, y applique la transformation de son nœud
// (échelle/rotation exportées depuis FBX), puis la recentre et la normalise
// à STAR_SIZE. Partagée par toutes les étoiles.
function useStarGeometry() {
  const { nodes } = useGLTF(STAR_MODEL_URL);

  return useMemo(() => {
    const node = nodes.Star;
    const geometry = node.geometry.clone();
    geometry.applyMatrix4(
      new Matrix4().compose(new Vector3(), node.quaternion, node.scale)
    );
    geometry.center();
    geometry.computeBoundingBox();
    const { min, max } = geometry.boundingBox;
    const largest = Math.max(max.x - min.x, max.y - min.y, max.z - min.z);
    geometry.scale(STAR_SIZE / largest, STAR_SIZE / largest, STAR_SIZE / largest);
    return geometry;
  }, [nodes]);
}

function randomPositionInDome() {
  // Direction uniforme sur l'hémisphère supérieur, puis rayon aléatoire.
  const theta = Math.random() * Math.PI * 2;
  const cosPhi = Math.random(); // y >= 0
  const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);
  const r = MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);
  return [
    r * sinPhi * Math.cos(theta),
    MIN_HEIGHT + r * cosPhi,
    r * sinPhi * Math.sin(theta),
  ];
}

function Star({ id, position, geometry, onStarClick }) {
  const [hovered, setHovered] = useState(false);
  const color = hovered ? STAR_HOVER_COLOR : STAR_COLOR;

  return (
    <mesh
      position={position}
      geometry={geometry}
      scale={hovered ? 1.4 : 1}
      onClick={(e) => {
        e.stopPropagation();
        onStarClick?.(id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "";
      }}
    >
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={hovered ? 1.5 : 0.8}
        roughness={0.6}
      />
    </mesh>
  );
}

export default function SkyScene({ cards = [], onStarClick }) {
  const geometry = useStarGeometry();

  const stars = useMemo(
    () => cards.map((card) => ({ id: card.id, position: randomPositionInDome() })),
    [cards]
  );

  return (
    <group>
      {stars.map((star) => (
        <Star
          key={star.id}
          id={star.id}
          position={star.position}
          geometry={geometry}
          onStarClick={onStarClick}
        />
      ))}
    </group>
  );
}

useGLTF.preload(STAR_MODEL_URL);
