# Pocket Stars

Pocket Stars est une exploration interactive en 3D de cartes Pokémon,
présentées sur une île flottante au sein d'un ciel étoilé. Le projet est
construit en React et Three.js, et consomme l'API publique
[TCGdex](https://api.tcgdex.net) pour récupérer les données des cartes.

## Stack technique

- [React](https://react.dev/) (via [Vite](https://vite.dev/))
- [Three.js](https://threejs.org/) (avec `@react-three/fiber` et `@react-three/drei`)
- [API TCGdex](https://api.tcgdex.net) (`api.tcgdex.net/v2/en`)

## Installation et lancement

```bash
npm install
npm run dev
```

## Structure du projet

- `src/components/` — composants d'affichage et de scène 3D (île flottante,
  caméra libre, ciel étoilé/ambiance, compagnon, recherche, révélation de
  carte).
- `src/services/` — couche d'accès à l'API TCGdex (récupération des cartes,
  repli sur des données locales en cas d'indisponibilité).
- `src/hooks/` — logique réutilisable côté React, notamment la gestion de la
  pool de cartes et du tirage aléatoire affiché à l'utilisateur.

## État du projet

🚧 Projet en phase de développement actif : l'intégration 3D et les
fonctionnalités décrites ci-dessus sont en cours de construction.
