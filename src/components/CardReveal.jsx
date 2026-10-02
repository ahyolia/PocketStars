// CardReveal.jsx
//
// Révélation de la carte sélectionnée (Pokémon), une fois choisie par
// l'utilisateur via un clic sur une étoile : overlay plein écran contenant un
// Canvas r3f transparent où la carte apparaît en 3D (Card3D), avec ses
// informations (nom, rareté, types) en HTML en dessous.
//
// Fermeture : bouton ×, touche Échap, ou clic hors de la carte (un glisser
// pour faire tourner la carte ne ferme pas l'overlay).
//
// Props attendues :
//   - card    : détail complet de la carte (TCGdex /cards/:id) ou null
//   - loading : true pendant le fetch du détail
//   - error   : erreur éventuelle du fetch du détail
//   - onClose : callback appelé pour refermer l'overlay

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import Card3D from "./Card3D";
import "./CardReveal.css";

// Au-delà de ce déplacement (px) entre l'appui et le relâchement, le geste
// est un glisser et non un clic.
const CLICK_TOLERANCE = 6;

function Spinner({ label }) {
  return (
    <div className="card-reveal__status">
      <div className="card-reveal__spinner" />
      <p>{label}</p>
    </div>
  );
}

// Scène de la carte : remontée pour chaque carte (key) afin de réinitialiser
// l'état de chargement de la texture et l'animation de révélation.
function CardStage({ card, onClose }) {
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);
  const pointerDownRef = useRef(null);

  const handlePointerMissed = (e) => {
    const down = pointerDownRef.current;
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    if (moved < CLICK_TOLERANCE) onClose?.();
  };

  return (
    <>
      <div
        className="card-reveal__stage"
        onPointerDown={(e) => {
          pointerDownRef.current = { x: e.clientX, y: e.clientY };
        }}
      >
        <Canvas
          camera={{ position: [0, 0, 6], fov: 40 }}
          onPointerMissed={handlePointerMissed}
        >
          <ambientLight intensity={1.4} />
          <directionalLight position={[2, 3, 5]} intensity={1.6} />
          <Suspense fallback={null}>
            <Card3D card={card} onReady={handleReady} />
          </Suspense>
        </Canvas>
      </div>

      {!ready && <Spinner label="Révélation de l’étoile…" />}

      <div className={`card-reveal__info${ready ? " is-visible" : ""}`}>
        <h2 className="card-reveal__name">{card.name}</h2>
        <p className="card-reveal__details">
          <span>{card.rarity ?? "Rareté inconnue"}</span>
          {card.types?.length > 0 && (
            <>
              <span aria-hidden="true"> · </span>
              <span>{card.types.join(", ")}</span>
            </>
          )}
        </p>
        <p className="card-reveal__hint">Fais glisser la carte pour la tourner</p>
      </div>
    </>
  );
}

export default function CardReveal({ card, loading, error, onClose }) {
  const isOpen = Boolean(card || loading || error);

  // Fermeture au clavier (Échap).
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="card-reveal" onClick={card ? undefined : onClose}>
      {loading && <Spinner label="Révélation de l’étoile…" />}

      {!loading && error && (
        <div className="card-reveal__status">
          <p>Impossible de charger cette carte.</p>
          <p className="card-reveal__error">{error.message}</p>
        </div>
      )}

      {!loading && card && <CardStage key={card.id} card={card} onClose={onClose} />}

      <button
        type="button"
        className="card-reveal__close"
        onClick={onClose}
        aria-label="Fermer"
      >
        ×
      </button>
    </div>
  );
}
