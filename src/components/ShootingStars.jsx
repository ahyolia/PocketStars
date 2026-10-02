// ShootingStars.jsx
//
// Étoiles filantes décoratives (non cliquables) traversant le ciel au-dessus
// de l'île. Un petit nombre d'emplacements est réutilisé en boucle : chaque
// étoile filante apparaît après un délai aléatoire, file en ligne droite
// pendant ~1 s avec une traînée qui s'estompe, puis attend avant de
// réapparaître ailleurs.
//
// La traînée est un quad recalculé à chaque frame face à la caméra (dégradé
// de transparence par couleurs de sommets), la tête un sprite lumineux.
//
// Props attendues :
//   - count : nombre d'étoiles filantes simultanées au maximum (défaut 3)

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  SRGBColorSpace,
  Vector3,
} from "three";

const MIN_DELAY = 1.5; // secondes entre deux passages d'un même emplacement
const MAX_DELAY = 5;
const MIN_DURATION = 0.8;
const MAX_DURATION = 1.4;
const MIN_SPEED = 28; // unités par seconde
const MAX_SPEED = 42;
const TRAIL_LENGTH = 7;
const TRAIL_WIDTH = 0.2;
const HEAD_SIZE = 1.4;

// Zone d'apparition : coque derrière les étoiles-cartes, au-dessus de l'île.
const MIN_RADIUS = 28;
const MAX_RADIUS = 38;
const MIN_HEIGHT = 10;
const MAX_HEIGHT = 26;

const COLOR = [1, 0.96, 0.82]; // blanc chaud

const randomBetween = (min, max) => min + Math.random() * (max - min);

function createGlowTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255, 250, 230, 1)");
  gradient.addColorStop(0.25, "rgba(255, 240, 190, 0.6)");
  gradient.addColorStop(1, "rgba(255, 240, 190, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

// Quad de traînée : 4 sommets (tête ×2, queue ×2), opaque à la tête et
// transparent à la queue.
function createTrailGeometry() {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(12), 3));
  geometry.setAttribute(
    "color",
    new BufferAttribute(new Float32Array([...COLOR, 1, ...COLOR, 1, ...COLOR, 0, ...COLOR, 0]), 4)
  );
  geometry.setIndex([0, 2, 1, 1, 2, 3]);
  return geometry;
}

// Écart maximal (rad) entre le point d'apparition et la direction regardée.
const SPAWN_SPREAD = 0.9;

// Tire une nouvelle trajectoire : départ dans la coque, du côté où regarde
// la caméra (pour que l'étoile filante soit visible même après avoir fait
// tourner la vue), direction descendante et globalement tangente au dôme.
function spawn(state, camera) {
  const facing = Math.atan2(-camera.position.z, -camera.position.x);
  const theta = facing + randomBetween(-SPAWN_SPREAD, SPAWN_SPREAD);
  const radius = randomBetween(MIN_RADIUS, MAX_RADIUS);
  state.start.set(
    radius * Math.cos(theta),
    randomBetween(MIN_HEIGHT, MAX_HEIGHT),
    radius * Math.sin(theta)
  );
  const tangent = new Vector3(-Math.sin(theta), 0, Math.cos(theta));
  if (Math.random() < 0.5) tangent.negate();
  state.direction.copy(tangent).add(new Vector3(0, -randomBetween(0.3, 0.7), 0)).normalize();
  state.speed = randomBetween(MIN_SPEED, MAX_SPEED);
  state.duration = randomBetween(MIN_DURATION, MAX_DURATION);
  state.age = 0;
}

function ShootingStar({ glowTexture }) {
  const trailRef = useRef();
  const headRef = useRef();
  const geometry = useMemo(() => createTrailGeometry(), []);
  const stateRef = useRef({
    start: new Vector3(),
    direction: new Vector3(),
    speed: 0,
    duration: 0,
    age: 0,
    // Premier passage décalé pour que les emplacements ne partent pas ensemble.
    wait: randomBetween(0.5, MAX_DELAY),
  });

  useEffect(() => () => geometry.dispose(), [geometry]);

  // Vecteurs de travail réutilisés à chaque frame.
  const work = useMemo(
    () => ({ head: new Vector3(), tail: new Vector3(), toCamera: new Vector3(), side: new Vector3() }),
    []
  );

  useFrame(({ camera }, delta) => {
    const state = stateRef.current;
    const trail = trailRef.current;
    const head = headRef.current;

    if (state.wait > 0) {
      state.wait -= delta;
      trail.visible = false;
      head.visible = false;
      if (state.wait <= 0) spawn(state, camera);
      return;
    }

    state.age += delta;
    if (state.age >= state.duration) {
      state.wait = randomBetween(MIN_DELAY, MAX_DELAY);
      trail.visible = false;
      head.visible = false;
      return;
    }

    // Apparition et disparition en fondu sur les extrémités de la course.
    const progress = state.age / state.duration;
    const fade = Math.min(1, progress / 0.15, (1 - progress) / 0.25);

    // La traînée s'allonge au départ, au lieu d'apparaître d'un bloc.
    const travelled = state.speed * state.age;
    const length = Math.min(TRAIL_LENGTH, travelled);
    work.head.copy(state.start).addScaledVector(state.direction, travelled);
    work.tail.copy(work.head).addScaledVector(state.direction, -length);

    // Largeur perpendiculaire à la direction et à l'axe de vue : le quad fait
    // toujours face à la caméra.
    work.toCamera.copy(camera.position).sub(work.head);
    work.side.crossVectors(state.direction, work.toCamera).normalize().multiplyScalar(TRAIL_WIDTH / 2);

    const position = trail.geometry.attributes.position;
    position.setXYZ(0, work.head.x + work.side.x, work.head.y + work.side.y, work.head.z + work.side.z);
    position.setXYZ(1, work.head.x - work.side.x, work.head.y - work.side.y, work.head.z - work.side.z);
    position.setXYZ(2, work.tail.x + work.side.x, work.tail.y + work.side.y, work.tail.z + work.side.z);
    position.setXYZ(3, work.tail.x - work.side.x, work.tail.y - work.side.y, work.tail.z - work.side.z);
    position.needsUpdate = true;
    trail.geometry.computeBoundingSphere();

    trail.material.opacity = fade;
    head.position.copy(work.head);
    head.material.opacity = fade;
    trail.visible = true;
    head.visible = true;
  });

  return (
    <>
      <mesh ref={trailRef} geometry={geometry} visible={false} frustumCulled={false}>
        {/* Double face : l'orientation du quad, recalculée à chaque frame,
            ne doit pas le faire disparaître par culling. */}
        <meshBasicMaterial
          vertexColors
          side={DoubleSide}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          fog={false}
          toneMapped={false}
        />
      </mesh>
      <sprite ref={headRef} scale={HEAD_SIZE} visible={false}>
        <spriteMaterial
          map={glowTexture}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          fog={false}
          toneMapped={false}
        />
      </sprite>
    </>
  );
}

export default function ShootingStars({ count = 3 }) {
  const glowTexture = useMemo(() => createGlowTexture(), []);
  useEffect(() => () => glowTexture.dispose(), [glowTexture]);

  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <ShootingStar key={i} glowTexture={glowTexture} />
      ))}
    </group>
  );
}
