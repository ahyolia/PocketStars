// SearchBar.jsx
//
// Barre de recherche en overlay en haut de l'écran, permettant de filtrer les
// cartes affichées par nom. Le filtrage lui-même est fait par le parent (App)
// sur la liste déjà chargée, sans nouvel appel API : ce composant ne remonte
// que le texte tapé.
//
// Seule la barre capte les clics : le reste de la bande en haut de l'écran
// laisse passer les interactions vers la scène 3D.
//
// Props attendues :
//   - value    : texte de recherche courant (champ contrôlé)
//   - onFilter : callback(texte) appelé à chaque frappe
//   - cards    : liste des cartes du tirage courant (pour le compteur)
//   - matches  : nombre de cartes correspondant à la recherche
//   - children : actions affichées à droite du champ (ex. bouton Shuffle)

import "./SearchBar.css";

export default function SearchBar({ value, onFilter, cards = [], matches, children }) {
  return (
    <div className="search-bar">
      <div className="search-bar__panel">
        <input
          type="search"
          className="search-bar__input"
          placeholder="Rechercher une carte…"
          aria-label="Rechercher une carte par nom"
          value={value}
          onChange={(e) => onFilter(e.target.value)}
        />
        {value && (
          <span className="search-bar__count" aria-live="polite">
            {matches} / {cards.length}
          </span>
        )}
        {children}
      </div>
    </div>
  );
}
