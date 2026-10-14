// FloatingIsland.jsx
//
// L'île flottante sur laquelle marche le joueur : un large plateau (surface
// en y = 0) posé sur une base rocheuse en cône inversé qui plonge dans le
// vide. Le sol porte une texture discrète et des rochers bas éparpillés,
// pour que le déplacement soit perceptible (sur un sol uni, on ne sent pas
// qu'on avance).

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  Color,
  IcosahedronGeometry,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";
import { ISLAND_RADIUS } from "../constants/world";

const PLATEAU_THICKNESS = 2;
const BASE_DEPTH = 28;
const GROUND_COLOR = "#5c3d63"; // mauve aubergine
const ROCK_COLORS = ["#4a3d6e", "#3d4a6e", "#5a4d80"];
const ROCK_COUNT = 70;
const TEXTURE_REPEAT = 24;

// Générateur pseudo-aléatoire à graine fixe : l'île est identique à chaque
// chargement.
function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

// Texture de sol : fond uni parsemé de taches claires et sombres.
function createGroundTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = GROUND_COLOR;
  ctx.fillRect(0, 0, size, size);

  const random = seededRandom(42);
  for (let i = 0; i < 260; i++) {
    const light = random() < 0.5;
    ctx.fillStyle = light ? "rgba(200, 150, 205, 0.18)" : "rgba(40, 14, 45, 0.22)";
    ctx.beginPath();
    ctx.arc(random() * size, random() * size, 1 + random() * 5, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(TEXTURE_REPEAT, TEXTURE_REPEAT);
  texture.anisotropy = 8;
  return texture;
}

// Rochers bas (à hauteur de cheville) répartis sur le plateau, en un seul
// InstancedMesh.
function Rocks() {
  const meshRef = useRef();
  const geometry = useMemo(() => new IcosahedronGeometry(1, 0), []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    const random = seededRandom(7);
    const dummy = new Object3D();
    const color = new Color();
    for (let i = 0; i < ROCK_COUNT; i++) {
      // Racine carrée : répartition uniforme sur la surface du disque.
      const r = Math.sqrt(random()) * (ISLAND_RADIUS - 4);
      const angle = random() * Math.PI * 2;
      const scale = 0.2 + random() * 0.6;
      dummy.position.set(r * Math.cos(angle), scale * 0.25, r * Math.sin(angle));
      dummy.rotation.set(random() * Math.PI, random() * Math.PI, 0);
      dummy.scale.set(scale * (1 + random()), scale * 0.7, scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color.set(ROCK_COLORS[i % ROCK_COLORS.length]));
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, ROCK_COUNT]}>
      <meshStandardMaterial flatShading roughness={0.9} />
    </instancedMesh>
  );
}

export default function FloatingIsland() {
  const groundTexture = useMemo(() => createGroundTexture(), []);
  useEffect(() => () => groundTexture.dispose(), [groundTexture]);

  return (
    <group>
      {/* Plateau : sa face supérieure est le sol (y = 0). */}
      <mesh position={[0, -PLATEAU_THICKNESS / 2, 0]}>
        <cylinderGeometry args={[ISLAND_RADIUS, ISLAND_RADIUS * 0.96, PLATEAU_THICKNESS, 96]} />
        <meshStandardMaterial map={groundTexture} roughness={1} />
      </mesh>
      {/* Base rocheuse en cône inversé, visible depuis le bord. */}
      <mesh position={[0, -PLATEAU_THICKNESS - BASE_DEPTH / 2, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[ISLAND_RADIUS * 0.96, BASE_DEPTH, 96]} />
        <meshStandardMaterial color="#4a3d6e" roughness={1} />
      </mesh>
      <Rocks />
    </group>
  );
}
