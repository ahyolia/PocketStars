// CardReveal.jsx
//
// Overlay d'affichage de la carte révélée (Pokémon), une fois sélectionnée
// par l'utilisateur via un clic sur une étoile. Version simple : fondu CSS,
// sans séquence cinématique 3D pour l'instant.
//
// Props attendues :
//   - card    : détail complet de la carte (TCGdex /cards/:id) ou null
//   - loading : true pendant le fetch du détail
//   - error   : erreur éventuelle du fetch du détail
//   - onClose : callback appelé pour refermer l'overlay

import { useEffect } from "react";
import "./CardReveal.css";

// TCGdex fournit une URL de base sans extension : la qualité et le format
// s'ajoutent en suffixe (ex. /high.webp, /low.png).
function cardImageUrl(card) {
  return card.image ? `${card.image}/high.webp` : null;
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

  const imageUrl = card && cardImageUrl(card);

  return (
    <div className="card-reveal" onClick={onClose}>
      <div className="card-reveal__panel" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="card-reveal__close"
          onClick={onClose}
          aria-label="Fermer"
        >
          ×
        </button>

        {loading && (
          <div className="card-reveal__status">
            <div className="card-reveal__spinner" />
            <p>Révélation de l’étoile…</p>
          </div>
        )}

        {!loading && error && (
          <div className="card-reveal__status">
            <p>Impossible de charger cette carte.</p>
            <p className="card-reveal__error">{error.message}</p>
          </div>
        )}

        {!loading && card && (
          <>
            {imageUrl ? (
              <img className="card-reveal__image" src={imageUrl} alt={card.name} />
            ) : (
              <div className="card-reveal__image card-reveal__image--missing">
                Image indisponible
              </div>
            )}
            <h2 className="card-reveal__name">{card.name}</h2>
            <dl className="card-reveal__details">
              <dt>Rareté</dt>
              <dd>{card.rarity ?? "—"}</dd>
              <dt>Types</dt>
              <dd>{card.types?.length ? card.types.join(", ") : "—"}</dd>
            </dl>
          </>
        )}
      </div>
    </div>
  );
}
