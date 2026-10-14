// PokeCompanion.jsx
//
// Compagnon animé affiché en coin d'écran (Mimikyu, sous son déguisement de
// Pikachu), accompagnant l'utilisateur dans sa navigation : il flotte
// doucement et parle dans une bulle (monologue d'accueil, réactions au clic
// sur une étoile et à la révélation d'une carte). Ce qu'il dit est géré par
// le parent via useCompanion.
//
// Un clic sur le compagnon ou sa bulle passe à la réplique suivante.
//
// Props attendues :
//   - message    : réplique à afficher, ou null pour se taire
//   - messageKey : identifiant de la réplique (rejoue l'animation de la
//                  bulle à chaque nouvelle réplique)
//   - onNext     : callback appelé au clic (réplique suivante)

import { useEffect, useState } from "react";
import { soundtrack } from "../audio/soundtrack";
import { COMPANION_NAME } from "../constants/companionLines";
import "./PokeCompanion.css";

// Illustration officielle de Mimikyu (n° 778), via le dépôt de sprites PokeAPI.
const SPRITE_URL =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/778.png";

export default function PokeCompanion({ message, messageKey, onNext }) {
  // Sprite indisponible (hors ligne…) : une étoile le remplace.
  const [spriteFailed, setSpriteFailed] = useState(false);

  // Voix : quelques "blips" à chaque nouvelle réplique (messageKey change à
  // chaque réplique, même si le texte se répète).
  useEffect(() => {
    if (message) soundtrack.play("companion", { length: message.length });
  }, [message, messageKey]);

  return (
    <div className="poke-companion">
      {message && (
        <p
          key={messageKey}
          className="poke-companion__bubble"
          role="status"
          onClick={onNext}
        >
          <span className="poke-companion__name">{COMPANION_NAME}</span>
          {message}
        </p>
      )}
      <button
        type="button"
        className="poke-companion__avatar"
        onClick={onNext}
        aria-label={message ? "Réplique suivante" : COMPANION_NAME}
      >
        {spriteFailed ? (
          <span className="poke-companion__fallback" aria-hidden="true">★</span>
        ) : (
          <img
            src={SPRITE_URL}
            alt=""
            draggable="false"
            onError={() => setSpriteFailed(true)}
          />
        )}
      </button>
    </div>
  );
}
