// SearchBar.jsx
//
// Barre de recherche en overlay en haut de l'écran, permettant de chercher
// une carte par nom dans toute la base TCGdex, avec le bouton Shuffle. La
// recherche elle-même est faite par le parent (App, via useCardSearch) : ce
// composant ne remonte que le texte tapé et affiche l'état de la recherche.
//
// Sur petit écran (≤ 600 px), la barre est repliée en une colonne de deux
// boutons ronds sur le côté gauche (loupe, Shuffle) : la loupe déploie la
// barre et place le curseur dans le champ ; elle se replie quand on quitte
// le champ (la recherche reste active, signalée par un badge sur la loupe).
//
// Seuls les boutons et la barre captent les clics : le reste de la bande en
// haut de l'écran laisse passer les interactions vers la scène 3D.
//
// Props attendues :
//   - value     : texte de recherche courant (champ contrôlé)
//   - onFilter  : callback(texte) appelé à chaque frappe
//   - onShuffle : callback du bouton Shuffle
//   - status    : texte d'état affiché à droite du champ (nombre de
//                 résultats, chargement…), ou rien
//   - hidden    : true pour masquer la barre (ex. pendant la révélation
//                 d'une carte, où elle serait inutilisable sous le voile)

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import "./SearchBar.css";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M15 15l5 5" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

function ShuffleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 7h3.5c5 0 6 10 11 10H21M3 17h3.5c2 0 3.2-1.6 4.2-3.5M13.3 9.5c1-1.9 2.2-2.5 4.2-2.5H21"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M18 4l3 3-3 3M18 14l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function SearchBar({ value, onFilter, onShuffle, status, hidden = false }) {
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef(null);

  // Déploie la barre puis donne le focus au champ, dans le même geste (sans
  // quoi le clavier ne s'ouvre pas sur iOS).
  const expand = () => {
    flushSync(() => setExpanded(true));
    inputRef.current?.focus();
  };

  return (
    <div
      className={`search-bar${hidden ? " is-hidden" : ""}${expanded ? " is-expanded" : ""}`}
      inert={hidden}
    >
      {/* Petits écrans : barre repliée en boutons ronds. */}
      <div className="search-bar__rail">
        <button
          type="button"
          className="search-bar__round"
          onClick={expand}
          aria-label={value ? `Recherche en cours : ${value}` : "Rechercher une carte"}
          aria-expanded={expanded}
        >
          <SearchIcon />
          {value && <span className="search-bar__badge" aria-hidden="true" />}
        </button>
        <button
          type="button"
          className="search-bar__round"
          onClick={onShuffle}
          aria-label="Shuffle : nouveau tirage"
        >
          <ShuffleIcon />
        </button>
      </div>

      <div
        className="search-bar__panel"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setExpanded(false);
        }}
      >
        <input
          ref={inputRef}
          type="search"
          className="search-bar__input"
          placeholder="Rechercher une carte…"
          aria-label="Rechercher une carte par nom dans toute la base"
          value={value}
          onChange={(e) => onFilter(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" || e.key === "Enter") e.currentTarget.blur();
          }}
        />
        {status && (
          <span className="search-bar__count" aria-live="polite">
            {status}
          </span>
        )}
        <button type="button" className="search-bar__shuffle" onClick={onShuffle}>
          Shuffle
        </button>
      </div>
    </div>
  );
}
