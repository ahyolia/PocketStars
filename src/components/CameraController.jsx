// CameraController.jsx
//
// Contrôle à la première personne : le joueur marche sur le sol de l'île, à
// hauteur des yeux.
//   - ZQSD / WASD ou flèches pour se déplacer (Maj pour courir). Les touches
//     sont lues par position physique (KeyboardEvent.code) : ZQSD sur un
//     clavier AZERTY, WASD sur un QWERTY, sans configuration.
//   - Regard à la souris, sans clic : au centre de l'écran la vue est fixe
//     (pour viser et cliquer une étoile sereinement) ; vers les bords, elle
//     tourne dans cette direction, d'autant plus vite qu'on s'approche du
//     bord. Le curseur reste libre pour cliquer sur les étoiles.
//   - Sur écran tactile (pas de survol), on regarde en faisant glisser le
//     doigt.
// Le joueur ne peut pas sortir du plateau (ISLAND_RADIUS - EDGE_MARGIN).
//
// À utiliser à l'intérieur du Canvas r3f orchestré par IslandScene, dont la
// caméra fixe la position de départ.
//
// Props attendues :
//   - enabled     : false pour ignorer clavier et souris (ex. carte ouverte)
//   - onFirstMove : callback appelé une fois, au premier déplacement

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils } from "three";
import { EDGE_MARGIN, EYE_HEIGHT, ISLAND_RADIUS } from "../constants/world";

const WALK_SPEED = 6; // unités par seconde
const RUN_MULTIPLIER = 2;
const ACCELERATION = 10; // facteur d'amortissement de la vitesse
const MIN_PITCH = -1.2;
const MAX_PITCH = 1.45; // ~83° : on peut lever les yeux presque à la verticale
const INITIAL_PITCH = 0.3; // léger regard vers le ciel au démarrage
const BOB_AMPLITUDE = 0.04;
const BOB_FREQUENCY = 9;

// Regard à la souris : part centrale de l'écran (en fraction de la
// demi-largeur / demi-hauteur) où la vue ne bouge pas, et vitesses de
// rotation maximales au bord (rad/s).
const DEAD_ZONE = 0.35;
const MAX_YAW_SPEED = 3.2;
const MAX_PITCH_SPEED = 2;
const LOOK_SMOOTHING = 22; // réponse quasi immédiate, sans à-coup

// Regard au doigt (écrans tactiles) : radians par pixel glissé.
const TOUCH_SENSITIVITY = 0.005;

const KEY_BINDINGS = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "backward",
  ArrowDown: "backward",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  ShiftLeft: "run",
  ShiftRight: "run",
};

// Les touches tapées dans un champ (barre de recherche) ne font pas marcher.
function isTyping(target) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

// Intensité de rotation pour une coordonnée normalisée dans [-1, 1] :
// nulle dans la zone morte, puis croissante jusqu'au bord (courbe en
// smoothstep : démarre en douceur mais monte vite).
function edgeStrength(value) {
  const beyond = (Math.abs(value) - DEAD_ZONE) / (1 - DEAD_ZONE);
  if (beyond <= 0) return 0;
  const t = Math.min(beyond, 1);
  return Math.sign(value) * t * t * (3 - 2 * t);
}

export default function CameraController({ enabled = true, onFirstMove }) {
  const domElement = useThree((state) => state.gl.domElement);

  const pressedRef = useRef(new Set());
  const lookRef = useRef({ yaw: 0, pitch: INITIAL_PITCH, yawSpeed: 0, pitchSpeed: 0 });
  // Position de la souris sur le canvas, normalisée dans [-1, 1] (y vers le
  // haut) ; inactive quand la souris est ailleurs (hors fenêtre, sur la
  // barre de recherche…).
  const pointerRef = useRef({ x: 0, y: 0, active: false });
  const velocityRef = useRef({ x: 0, z: 0, bobPhase: 0 });
  const movedRef = useRef(false);

  // Clavier.
  useEffect(() => {
    const pressed = pressedRef.current;
    if (!enabled) {
      pressed.clear();
      return;
    }

    const onKeyDown = (e) => {
      const action = KEY_BINDINGS[e.code];
      if (!action || isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code.startsWith("Arrow")) e.preventDefault();
      pressed.add(action);
    };
    const onKeyUp = (e) => {
      const action = KEY_BINDINGS[e.code];
      if (action) pressed.delete(action);
    };
    // Évite une touche "collée" si la fenêtre perd le focus touche enfoncée.
    const onBlur = () => pressed.clear();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      pressed.clear();
    };
  }, [enabled]);

  // Regard : position de la souris (sans clic), ou glisser du doigt.
  useEffect(() => {
    const pointer = pointerRef.current;
    if (!enabled) {
      pointer.active = false;
      return;
    }
    let touchDragging = false;
    let lastX = 0;
    let lastY = 0;

    const onPointerMove = (e) => {
      if (e.pointerType === "mouse") {
        // Seule la souris posée sur la scène fait tourner la vue.
        if (e.target !== domElement) {
          pointer.active = false;
          return;
        }
        const rect = domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = 1 - ((e.clientY - rect.top) / rect.height) * 2;
        pointer.active = true;
        return;
      }
      if (!touchDragging) return;
      const look = lookRef.current;
      look.yaw += (e.clientX - lastX) * TOUCH_SENSITIVITY;
      look.pitch = MathUtils.clamp(
        look.pitch + (e.clientY - lastY) * TOUCH_SENSITIVITY,
        MIN_PITCH,
        MAX_PITCH
      );
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onPointerDown = (e) => {
      if (e.pointerType === "mouse") return;
      touchDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onPointerUp = () => {
      touchDragging = false;
    };
    // Souris sortie de la fenêtre : la vue s'arrête de tourner.
    const onMouseOut = (e) => {
      if (!e.relatedTarget) pointer.active = false;
    };

    domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    document.addEventListener("mouseout", onMouseOut);
    return () => {
      domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("mouseout", onMouseOut);
      pointer.active = false;
    };
  }, [enabled, domElement]);

  useFrame(({ camera }, delta) => {
    const pressed = pressedRef.current;
    const look = lookRef.current;
    const pointer = pointerRef.current;
    const velocity = velocityRef.current;

    // Regard : la souris près d'un bord fait tourner la vue de ce côté
    // (à droite → yaw décroît, en haut → on lève les yeux).
    const targetYawSpeed = pointer.active ? -edgeStrength(pointer.x) * MAX_YAW_SPEED : 0;
    const targetPitchSpeed = pointer.active ? edgeStrength(pointer.y) * MAX_PITCH_SPEED : 0;
    look.yawSpeed = MathUtils.damp(look.yawSpeed, targetYawSpeed, LOOK_SMOOTHING, delta);
    look.pitchSpeed = MathUtils.damp(look.pitchSpeed, targetPitchSpeed, LOOK_SMOOTHING, delta);
    look.yaw += look.yawSpeed * delta;
    look.pitch = MathUtils.clamp(look.pitch + look.pitchSpeed * delta, MIN_PITCH, MAX_PITCH);

    // Direction voulue, dans le repère du regard (à plat, sans le tangage).
    const inputForward = (pressed.has("forward") ? 1 : 0) - (pressed.has("backward") ? 1 : 0);
    const inputRight = (pressed.has("right") ? 1 : 0) - (pressed.has("left") ? 1 : 0);
    const inputLength = Math.hypot(inputForward, inputRight) || 1;
    const speed = WALK_SPEED * (pressed.has("run") ? RUN_MULTIPLIER : 1);
    const sin = Math.sin(look.yaw);
    const cos = Math.cos(look.yaw);
    const targetX = ((-sin * inputForward + cos * inputRight) / inputLength) * speed;
    const targetZ = ((-cos * inputForward - sin * inputRight) / inputLength) * speed;

    // Accélération et freinage progressifs.
    velocity.x = MathUtils.damp(velocity.x, targetX, ACCELERATION, delta);
    velocity.z = MathUtils.damp(velocity.z, targetZ, ACCELERATION, delta);

    camera.position.x += velocity.x * delta;
    camera.position.z += velocity.z * delta;

    // Reste sur le plateau : ramène le joueur sur le cercle limite.
    const maxRadius = ISLAND_RADIUS - EDGE_MARGIN;
    const radius = Math.hypot(camera.position.x, camera.position.z);
    if (radius > maxRadius) {
      camera.position.x *= maxRadius / radius;
      camera.position.z *= maxRadius / radius;
    }

    // Léger balancement de la tête en marchant.
    const groundSpeed = Math.hypot(velocity.x, velocity.z);
    velocity.bobPhase += delta * BOB_FREQUENCY * (groundSpeed / WALK_SPEED);
    const bob = Math.sin(velocity.bobPhase) * BOB_AMPLITUDE * Math.min(groundSpeed / WALK_SPEED, 1);
    camera.position.y = EYE_HEIGHT + bob;

    camera.rotation.order = "YXZ";
    camera.rotation.set(look.pitch, look.yaw, 0);

    if (!movedRef.current && groundSpeed > 0.5) {
      movedRef.current = true;
      onFirstMove?.();
    }
  });

  return null;
}
