// Card3D.jsx
//
// Carte Pokémon en 3D (à rendre dans un Canvas r3f) : un rectangle à coins
// arrondis avec une fine tranche, l'image TCGdex au recto et un dos "Pocket
// Stars" généré dans un canvas 2D (pas de dos officiel, soumis à copyright).
//
// Animation : la carte arrive de dos, petite, et tourne sur elle-même en
// grandissant jusqu'à présenter son recto (révélation), puis oscille
// doucement. L'utilisateur peut la faire pivoter à la souris
// (PresentationControls) ; elle revient de face au relâchement.
//
// Props attendues :
//   - card    : détail de la carte (TCGdex) ; seuls image et name sont lus
//   - onReady : callback appelé une fois la texture du recto chargée

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PresentationControls, useTexture } from "@react-three/drei";
import {
  CanvasTexture,
  ExtrudeGeometry,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
} from "three";

// Proportions d'une carte Pokémon (63 × 88 mm).
const CARD_WIDTH = 2.5;
const CARD_HEIGHT = (CARD_WIDTH * 88) / 63;
const CARD_RADIUS = 0.12;
const CARD_THICKNESS = 0.03;

const EDGE_COLOR = "#e8e4d0";

const REVEAL_DURATION = 1.6; // secondes
const REVEAL_TURNS = 1.5; // demi-tours impairs : la carte part de dos

// Part de la hauteur de l'écran occupée par la carte (le bas est réservé
// aux informations HTML).
const VIEWPORT_HEIGHT_RATIO = 0.56;
const VIEWPORT_WIDTH_RATIO = 0.8;

function roundedRectShape(w, h, r) {
  const x = -w / 2;
  const y = -h / 2;
  const shape = new Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

// Géométries partagées par toutes les cartes : une face (recto/verso) dont
// les UV couvrent exactement [0, 1], et la tranche extrudée.
function createCardGeometries() {
  const shape = roundedRectShape(CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);

  const face = new ShapeGeometry(shape, 8);
  const position = face.attributes.position;
  const uv = face.attributes.uv;
  for (let i = 0; i < position.count; i++) {
    uv.setXY(
      i,
      position.getX(i) / CARD_WIDTH + 0.5,
      position.getY(i) / CARD_HEIGHT + 0.5
    );
  }

  const edge = new ExtrudeGeometry(shape, {
    depth: CARD_THICKNESS,
    bevelEnabled: false,
    curveSegments: 8,
  });
  edge.translate(0, 0, -CARD_THICKNESS / 2);

  return { face, edge };
}

// Dessine une étoile à cinq branches centrée en (cx, cy).
function drawStar(ctx, cx, cy, outer, inner) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
  }
  ctx.closePath();
}

function createCanvasTexture(draw) {
  const canvas = document.createElement("canvas");
  canvas.width = 630;
  canvas.height = 880;
  draw(canvas.getContext("2d"), canvas.width, canvas.height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// Dos de carte "Pocket Stars" : ciel nocturne, étoile dorée centrale.
function createBackTexture() {
  return createCanvasTexture((ctx, w, h) => {
    const sky = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, h * 0.7);
    sky.addColorStop(0, "#3a2f80");
    sky.addColorStop(1, "#0b0a1f");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Petites étoiles à positions pseudo-aléatoires mais fixes.
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    for (let i = 0; i < 90; i++) {
      ctx.beginPath();
      ctx.arc(random() * w, random() * h, random() * 2 + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cadre doré.
    ctx.strokeStyle = "#f5d94a";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.roundRect(28, 28, w - 56, h - 56, 26);
    ctx.stroke();

    // Étoile centrale avec halo.
    ctx.shadowColor = "#f5d94a";
    ctx.shadowBlur = 60;
    ctx.fillStyle = "#f5d94a";
    drawStar(ctx, w / 2, h / 2 - 20, 150, 62);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#f5d94a";
    ctx.font = "bold 46px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("POCKET STARS", w / 2, h - 110);
  });
}

// Recto de remplacement pour les cartes sans image TCGdex.
function createPlaceholderTexture(name) {
  return createCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = "#16142e";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#3a3570";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.roundRect(28, 28, w - 56, h - 56, 26);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#f5d94a";
    ctx.font = "bold 56px system-ui, sans-serif";
    ctx.fillText(name ?? "?", w / 2, h / 2 - 20, w - 100);
    ctx.fillStyle = "rgba(216, 214, 240, 0.7)";
    ctx.font = "32px system-ui, sans-serif";
    ctx.fillText("Image indisponible", w / 2, h / 2 + 40);
  });
}

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function CardMesh({ front, onReady }) {
  const { face, edge } = useMemo(() => createCardGeometries(), []);
  const back = useMemo(() => createBackTexture(), []);
  const groupRef = useRef();
  const startRef = useRef(null);
  const viewport = useThree((state) => state.viewport);

  const scale = Math.min(
    (viewport.height * VIEWPORT_HEIGHT_RATIO) / CARD_HEIGHT,
    (viewport.width * VIEWPORT_WIDTH_RATIO) / CARD_WIDTH
  );

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  useEffect(
    () => () => {
      face.dispose();
      edge.dispose();
      back.dispose();
    },
    [face, edge, back]
  );

  useFrame((state) => {
    const group = groupRef.current;
    const now = state.clock.elapsedTime;
    if (startRef.current === null) startRef.current = now;
    const t = now - startRef.current;

    if (t < REVEAL_DURATION) {
      const p = easeOutCubic(t / REVEAL_DURATION);
      group.rotation.set(0, -(1 - p) * REVEAL_TURNS * Math.PI * 2, 0);
      group.scale.setScalar(0.15 + 0.85 * p);
    } else {
      // Oscillation douce, continue avec la fin de la révélation (sin(0) = 0).
      const idle = t - REVEAL_DURATION;
      group.rotation.set(Math.sin(idle * 0.6) * 0.06, Math.sin(idle * 0.8) * 0.22, 0);
      group.scale.setScalar(1);
    }
  });

  return (
    <group scale={scale} position={[0, viewport.height * 0.06, 0]}>
      <PresentationControls
        cursor
        snap
        speed={1.5}
        polar={[-0.4, 0.4]}
        azimuth={[-Infinity, Infinity]}
      >
        <group ref={groupRef}>
          <mesh geometry={edge}>
            <meshStandardMaterial color={EDGE_COLOR} roughness={0.6} />
          </mesh>
          <mesh geometry={face} position={[0, 0, CARD_THICKNESS / 2 + 0.001]}>
            <meshStandardMaterial map={front} roughness={0.45} toneMapped={false} />
          </mesh>
          <mesh
            geometry={face}
            position={[0, 0, -CARD_THICKNESS / 2 - 0.001]}
            rotation={[0, Math.PI, 0]}
          >
            <meshStandardMaterial map={back} roughness={0.45} toneMapped={false} />
          </mesh>
        </group>
      </PresentationControls>
    </group>
  );
}

function ImageCard({ url, onReady }) {
  const texture = useTexture(url);
  return <CardMesh front={texture} onReady={onReady} />;
}

function PlaceholderCard({ name, onReady }) {
  const texture = useMemo(() => createPlaceholderTexture(name), [name]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <CardMesh front={texture} onReady={onReady} />;
}

export default function Card3D({ card, onReady }) {
  // TCGdex fournit une URL de base sans extension : la qualité et le format
  // s'ajoutent en suffixe.
  return card.image ? (
    <ImageCard url={`${card.image}/high.webp`} onReady={onReady} />
  ) : (
    <PlaceholderCard name={card.name} onReady={onReady} />
  );
}
