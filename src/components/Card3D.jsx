// Card3D.jsx
//
// Carte Pokémon en 3D (à rendre dans un Canvas r3f) : un rectangle à coins
// arrondis avec une fine tranche, l'image TCGdex au recto et un dos "Pocket
// Stars" généré dans un canvas 2D (pas de dos officiel, soumis à copyright).
//
// Animation : la carte arrive de dos, petite, et tourne sur elle-même en
// grandissant jusqu'à présenter son recto (révélation), puis oscille
// doucement. L'utilisateur peut la faire pivoter à la souris ou au doigt
// (PresentationControls), en glissant n'importe où sur l'écran et pas
// seulement sur la carte : vue de profil, elle n'est plus qu'un mince filet
// que le doigt quitterait aussitôt. Elle revient de face au relâchement.
//
// Les cartes rares reçoivent un calque holographique sur le recto
// (holoMaterial.js), dont l'intensité dépend de la rareté (rarities.js).
//
// Props attendues :
//   - card    : détail de la carte (TCGdex) ; seuls image, name et rarity
//               sont lus
//   - onReady : callback appelé une fois la texture du recto chargée

import { Component, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PresentationControls, useTexture } from "@react-three/drei";
import {
  CanvasTexture,
  ExtrudeGeometry,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
} from "three";
import { getHoloStrength } from "../constants/rarities";
import { createHoloMaterial } from "./holoMaterial";

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

// Palette "cartoon" de l'interface (cf. index.css).
const INK = "#1d1338";
const PAPER = "#fff7e6";
const SUN = "#ffd23f";
const VIOLET = "#8c6bff";
const NIGHT = "#3b2a8c";
const CARTOON_FONT = "Fredoka, system-ui, sans-serif";

// Texture dessinée dans un canvas 2D. Le texte utilise la police Fredoka,
// chargée par la page : si elle n'est pas encore prête au premier dessin,
// la texture est redessinée dès qu'elle l'est.
function createCanvasTexture(draw) {
  const canvas = document.createElement("canvas");
  canvas.width = 630;
  canvas.height = 880;
  const ctx = canvas.getContext("2d");
  draw(ctx, canvas.width, canvas.height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;

  if (document.fonts && !document.fonts.check(`700 40px ${CARTOON_FONT}`)) {
    document.fonts.load(`700 40px ${CARTOON_FONT}`).then(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      draw(ctx, canvas.width, canvas.height);
      texture.needsUpdate = true;
    });
  }
  return texture;
}

// Générateur pseudo-aléatoire à graine fixe : décor identique d'une carte à
// l'autre.
function seededRandom(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

// Petite étincelle à quatre branches.
function drawSparkle(ctx, cx, cy, size) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.quadraticCurveTo(cx, cy, cx + size, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + size);
  ctx.quadraticCurveTo(cx, cy, cx - size, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - size);
  ctx.closePath();
}

// Fond de carte cartoon : aplat de nuit semé d'étincelles et de pois,
// cadre crème cerné d'un trait épais.
function drawCartoonFrame(ctx, w, h) {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);

  // Cadre crème, puis panneau intérieur.
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.roundRect(14, 14, w - 28, h - 28, 34);
  ctx.fill();

  ctx.fillStyle = NIGHT;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.roundRect(44, 44, w - 88, h - 88, 24);
  ctx.fill();
  // Le décor est découpé à la forme du panneau.

  ctx.save();
  ctx.clip();
  const random = seededRandom(7);
  for (let i = 0; i < 26; i++) {
    const x = 50 + random() * (w - 100);
    const y = 50 + random() * (h - 100);
    if (i % 3 === 0) {
      ctx.fillStyle = "rgba(255, 247, 230, 0.18)";
      ctx.beginPath();
      ctx.arc(x, y, 6 + random() * 8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = i % 2 ? SUN : PAPER;
      drawSparkle(ctx, x, y, 8 + random() * 10);
      ctx.fill();
    }
  }
  ctx.restore();

  // Trait du panneau, par-dessus le décor.
  ctx.beginPath();
  ctx.roundRect(44, 44, w - 88, h - 88, 24);
  ctx.stroke();
}

// Texte cartoon : lettres crème cernées d'encre, ombre violette décalée.
function drawCartoonText(ctx, text, x, y, size, maxWidth) {
  ctx.font = `700 ${size}px ${CARTOON_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = size * 0.22;
  ctx.strokeStyle = VIOLET;
  ctx.strokeText(text, x, y + size * 0.12, maxWidth);
  ctx.strokeStyle = INK;
  ctx.strokeText(text, x, y, maxWidth);
  ctx.fillStyle = PAPER;
  ctx.fillText(text, x, y, maxWidth);
}

// Dos de carte "Pocket Stars" : grosse étoile souriante sur ciel de nuit.
function createBackTexture() {
  return createCanvasTexture((ctx, w, h) => {
    drawCartoonFrame(ctx, w, h);

    const cx = w / 2;
    const cy = h / 2 - 40;
    ctx.lineJoin = "round";

    // Ombre portée violette, puis étoile jaune cernée.
    drawStar(ctx, cx, cy + 16, 175, 80);
    ctx.fillStyle = VIOLET;
    ctx.fill();
    drawStar(ctx, cx, cy, 175, 80);
    ctx.fillStyle = SUN;
    ctx.fill();
    ctx.lineWidth = 12;
    ctx.strokeStyle = INK;
    ctx.stroke();

    // Reflet.
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.beginPath();
    ctx.ellipse(cx - 52, cy - 52, 14, 24, -0.6, 0, Math.PI * 2);
    ctx.fill();

    // Visage : yeux, joues, sourire.
    ctx.fillStyle = INK;
    for (const dx of [-30, 30]) {
      ctx.beginPath();
      ctx.ellipse(cx + dx, cy + 4, 9, 15, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255, 120, 150, 0.6)";
    for (const dx of [-58, 58]) {
      ctx.beginPath();
      ctx.ellipse(cx + dx, cy + 30, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy + 26, 16, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    drawCartoonText(ctx, "POCKET STARS", cx, h - 150, 64, w - 140);
  });
}

// Recto de remplacement pour les cartes sans image TCGdex.
function createPlaceholderTexture(name) {
  return createCanvasTexture((ctx, w, h) => {
    drawCartoonFrame(ctx, w, h);
    drawCartoonText(ctx, name ?? "?", w / 2, h / 2 - 30, 58, w - 140);

    // Étiquette "Image indisponible".
    ctx.font = `600 30px ${CARTOON_FONT}`;
    const label = "Image indisponible";
    const labelWidth = ctx.measureText(label).width + 44;
    ctx.fillStyle = PAPER;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(w / 2 - labelWidth / 2, h / 2 + 30, labelWidth, 52, 26);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, w / 2, h / 2 + 57);
  });
}

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

// Calque holographique additif, juste devant le recto.
function HoloLayer({ geometry, map, strength }) {
  const material = useMemo(() => createHoloMaterial(map, strength), [map, strength]);
  const meshRef = useRef();

  useEffect(() => () => material.dispose(), [material]);

  useFrame((state) => {
    meshRef.current.material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={[0, 0, CARD_THICKNESS / 2 + 0.002]}
    />
  );
}

function CardMesh({ front, holoStrength, onReady }) {
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
        global
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
          {holoStrength > 0 && (
            <HoloLayer geometry={face} map={front} strength={holoStrength} />
          )}
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

function ImageCard({ url, ...props }) {
  const texture = useTexture(url);
  return <CardMesh front={texture} {...props} />;
}

function PlaceholderCard({ name, ...props }) {
  const texture = useMemo(() => createPlaceholderTexture(name), [name]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <CardMesh front={texture} {...props} />;
}

// Si l'image ne se charge pas (réseau, ou en-têtes CORS invalides renvoyés
// par TCGdex pour certaines cartes), useTexture lève une erreur : sans ce
// garde-fou elle démonterait toute l'application (écran noir). On affiche
// alors le recto de remplacement.
class ImageErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn("Image de carte indisponible :", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function Card3D({ card, onReady }) {
  const holoStrength = getHoloStrength(card.rarity);
  const placeholder = (
    <PlaceholderCard name={card.name} holoStrength={holoStrength} onReady={onReady} />
  );

  if (!card.image) return placeholder;

  // TCGdex fournit une URL de base sans extension : la qualité et le format
  // s'ajoutent en suffixe.
  return (
    <ImageErrorBoundary fallback={placeholder}>
      <ImageCard
        url={`${card.image}/high.webp`}
        holoStrength={holoStrength}
        onReady={onReady}
      />
    </ImageErrorBoundary>
  );
}
