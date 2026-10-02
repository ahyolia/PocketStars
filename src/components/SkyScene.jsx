// SkyScene.jsx
//
// Ciel étoilé au-dessus de l'île : chaque carte est représentée par une
// étoile générique (modèle 3D public/models/Star…glb), sans aucun indice
// visuel sur son identité. Le clic sur une étoile déclenche
// onStarClick(card.id).
//
// Props attendues :
//   - cards        : tableau de cartes { id, localId, name } du tirage courant
//   - visibleCards : sous-ensemble de `cards` à afficher (ex. résultat d'une
//                    recherche) ; toutes les cartes si omis
//   - onStarClick  : callback(id) déclenché au clic sur une étoile
//
// Les positions sont tirées aléatoirement dans une coque hémisphérique
// au-dessus de l'île, et mémoïsées sur `cards` : elles restent stables entre
// les re-renders et ne sont recalculées que lorsque le tirage change
// (shuffle). Filtrer via `visibleCards` masque des étoiles sans déplacer les
// autres.
//
// Pour un ciel vivant : chaque étoile flotte, tourne sur elle-même et
// scintille à son propre rythme, l'ensemble tourne très lentement autour de
// l'île, et des étoiles filantes décoratives (ShootingStars) traversent le
// fond devant un champ d'étoiles lointaines. Si l'utilisateur a demandé à
// réduire les animations, rotation du ciel et étoiles filantes sont coupées.

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars, useGLTF } from "@react-three/drei";
import { MathUtils, Matrix4, Vector3 } from "three";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import ShootingStars from "./ShootingStars";

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

// Rotation du ciel autour de l'île (rad/s) : un tour en ~7 minutes, assez
// lent pour que les étoiles restent faciles à cliquer.
const SKY_ROTATION_SPEED = 0.015;

// Animation propre à chaque étoile.
const BOB_AMPLITUDE = 0.35;
const HOVER_SCALE = 1.4;

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

// Paramètres d'animation aléatoires, tirés une fois par étoile pour que
// toutes ne bougent pas à l'unisson.
function randomMotion() {
  return {
    phase: Math.random() * Math.PI * 2,
    bobSpeed: 0.4 + Math.random() * 0.5,
    spinSpeed: (0.2 + Math.random() * 0.4) * (Math.random() < 0.5 ? -1 : 1),
    twinkleSpeed: 1 + Math.random() * 2,
  };
}

function Star({ id, position, motion, geometry, onStarClick }) {
  const [hovered, setHovered] = useState(false);
  const color = hovered ? STAR_HOVER_COLOR : STAR_COLOR;
  const meshRef = useRef();

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    const t = state.clock.elapsedTime;
    mesh.position.y = Math.sin(t * motion.bobSpeed + motion.phase) * BOB_AMPLITUDE;
    mesh.rotation.y += motion.spinSpeed * delta;
    mesh.scale.setScalar(
      MathUtils.damp(mesh.scale.x, hovered ? HOVER_SCALE : 1, 12, delta)
    );
    // Scintillement : variation douce de la luminosité.
    mesh.material.emissiveIntensity = hovered
      ? 1.5
      : 0.8 + 0.35 * Math.sin(t * motion.twinkleSpeed + motion.phase);
  });

  // Curseur "main" tant que l'étoile est survolée ; le nettoyage le rétablit
  // aussi si l'étoile disparaît pendant le survol (filtre, shuffle).
  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={(e) => {
          e.stopPropagation();
          onStarClick?.(id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial color={color} emissive={color} roughness={0.6} />
      </mesh>
    </group>
  );
}

export default function SkyScene({ cards = [], visibleCards, onStarClick }) {
  const geometry = useStarGeometry();
  const reducedMotion = usePrefersReducedMotion();
  const skyRef = useRef();

  const stars = useMemo(
    () =>
      cards.map((card) => ({
        id: card.id,
        position: randomPositionInDome(),
        motion: randomMotion(),
      })),
    [cards]
  );

  useFrame((_, delta) => {
    if (!reducedMotion) skyRef.current.rotation.y += SKY_ROTATION_SPEED * delta;
  });

  const visibleIds = useMemo(
    () => (visibleCards ? new Set(visibleCards.map((card) => card.id)) : null),
    [visibleCards]
  );
  const shownStars = visibleIds
    ? stars.filter((star) => visibleIds.has(star.id))
    : stars;

  return (
    <>
      {/* Champ d'étoiles lointaines, pour la profondeur. */}
      <Stars
        radius={70}
        depth={40}
        count={3000}
        factor={3}
        saturation={0}
        fade
        speed={reducedMotion ? 0 : 0.6}
      />
      {!reducedMotion && <ShootingStars />}

      <group ref={skyRef}>
        {shownStars.map((star) => (
          <Star
            key={star.id}
            id={star.id}
            position={star.position}
            motion={star.motion}
            geometry={geometry}
            onStarClick={onStarClick}
          />
        ))}
      </group>
    </>
  );
}

useGLTF.preload(STAR_MODEL_URL);
