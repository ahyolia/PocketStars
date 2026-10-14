// SoundControls.jsx
//
// Petit lecteur en haut à droite : titre du morceau en cours, boutons
// "morceau suivant", "musique" (coupe la musique de fond en gardant les
// bruitages) et sourdine générale. Tant que le son n'est pas débloqué par un
// premier geste, le titre invite à cliquer.
//
// Props attendues :
//   - hidden : true pour masquer le lecteur (ex. pendant la révélation
//              d'une carte, dont le bouton de fermeture occupe le même coin)

import { soundtrack } from "../audio/soundtrack";
import { useSoundtrack } from "../hooks/useSoundtrack";
import "./SoundControls.css";

function SpeakerIcon({ muted }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
      {muted ? (
        <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      )}
    </svg>
  );
}

function MusicIcon({ off }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 17V5l10-2v12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="6.5" cy="17.5" r="2.8" fill="currentColor" />
      <circle cx="16.5" cy="15.5" r="2.8" fill="currentColor" />
      {off && <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />}
    </svg>
  );
}

function NextIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 6l9 6-9 6z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
      <path d="M18 6v12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function SoundControls({ hidden = false }) {
  const { muted, musicMuted, unlocked, trackTitle, toggleMute, toggleMusic, nextTrack } =
    useSoundtrack();

  let title = trackTitle;
  if (muted) title = "Son coupé";
  else if (musicMuted) title = "Musique coupée";
  else if (!unlocked) title = "Clique pour le son";

  return (
    <div className={`sound-controls${hidden ? " is-hidden" : ""}`} inert={hidden}>
      <span className="sound-controls__title" aria-live="polite">
        <span aria-hidden="true">♪ </span>
        {title}
      </span>
      <button
        type="button"
        className="sound-controls__button"
        onClick={() => {
          soundtrack.play("click");
          nextTrack();
        }}
        disabled={muted || musicMuted}
        aria-label="Morceau suivant"
        title="Morceau suivant"
      >
        <NextIcon />
      </button>
      <button
        type="button"
        className="sound-controls__button"
        onClick={() => {
          soundtrack.play("click");
          toggleMusic();
        }}
        disabled={muted}
        aria-pressed={musicMuted}
        aria-label={musicMuted ? "Activer la musique" : "Couper la musique (garder les bruitages)"}
        title={musicMuted ? "Activer la musique" : "Couper la musique (garder les bruitages)"}
      >
        <MusicIcon off={musicMuted} />
      </button>
      <button
        type="button"
        className="sound-controls__button"
        onClick={() => {
          toggleMute();
          // Joué seulement si le son vient d'être réactivé.
          soundtrack.play("click");
        }}
        aria-pressed={muted}
        aria-label={muted ? "Activer le son" : "Couper le son"}
        title={muted ? "Activer le son" : "Couper le son"}
      >
        <SpeakerIcon muted={muted} />
      </button>
    </div>
  );
}
