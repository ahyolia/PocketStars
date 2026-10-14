// SearchBar.jsx
//
// Barre de recherche en overlay en haut de l'écran, permettant de chercher
// une carte par nom dans toute la base TCGdex. La recherche elle-même est
// faite par le parent (App, via useCardSearch) : ce composant ne remonte que
// le texte tapé et affiche l'état de la recherche.
//
// Seule la barre capte les clics : le reste de la bande en haut de l'écran
// laisse passer les interactions vers la scène 3D.
//
// Props attendues :
//   - value    : texte de recherche courant (champ contrôlé)
//   - onFilter : callback(texte) appelé à chaque frappe
//   - status   : texte d'état affiché à droite du champ (nombre de
//                résultats, chargement…), ou rien
//   - hidden   : true pour masquer la barre (ex. pendant la révélation d'une
//                carte, où elle serait inutilisable sous le voile)
//   - children : actions affichées à droite du champ (ex. bouton Shuffle)

import "./SearchBar.css";

export default function SearchBar({ value, onFilter, status, hidden = false, children }) {
  return (
    <div className={`search-bar${hidden ? " is-hidden" : ""}`} inert={hidden}>
      <div className="search-bar__panel">
        <input
          type="search"
          className="search-bar__input"
          placeholder="Rechercher une carte…"
          aria-label="Rechercher une carte par nom dans toute la base"
          value={value}
          onChange={(e) => onFilter(e.target.value)}
        />
        {status && (
          <span className="search-bar__count" aria-live="polite">
            {status}
          </span>
        )}
        {children}
      </div>
    </div>
  );
}
