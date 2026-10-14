# Pocket Stars

Pocket Stars est une exploration interactive en 3D de cartes Pokémon. Le
joueur marche à la première personne sur une île flottante, sous un ciel de
nuit où chaque étoile cache une carte. Un clic sur une étoile la fait
descendre et révèle la carte en 3D, commentée par Mimikyu, le compagnon.
Les données viennent de l'API publique [TCGdex](https://tcgdex.dev).

## Fonctionnalités

- **Île en vue à la première personne** : déplacement au clavier (ZQSD/WASD
  ou flèches, Maj pour courir) et regard à la souris, sans clic ; sur écran
  tactile, joystick virtuel et regard au doigt.
- **Ciel de cartes** : 50 étoiles tirées au hasard dans une sélection de 250
  cartes ; le bouton Shuffle refait un tirage.
- **Recherche par nom dans toute la base TCGdex**, les résultats devenant les
  étoiles du ciel (50 au plus).
- **Révélation en 3D** : la carte arrive de dos en tournoyant, se retourne,
  puis se fait pivoter à la souris ou au doigt. Les cartes rares ont un
  reflet holographique dont l'intensité dépend de la rareté.
- **Compagnon** (Mimikyu) : monologue d'accueil et réactions au clic sur une
  étoile, à la révélation (selon la rareté, la catégorie ou le type de la
  carte) et aux erreurs.
- **Bande-son générée en code** : trois musiques de fond, bruitages (étoiles,
  révélation, voix du compagnon, pas, interface), sourdine générale ou de la
  musique seule.
- **Responsive** : téléphone (portrait et paysage), tablette, ordinateur ;
  plein écran sur mobile.

## Prérequis

- [Node.js](https://nodejs.org/) `^20.19` ou `>= 22.12` (exigé par Vite 8)
- npm

## Installation et lancement

```bash
npm install
npm run dev
```

L'application est alors servie sur <http://localhost:5173>.

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement avec rechargement à chaud |
| `npm run build` | Build de production dans `dist/` (site statique) |
| `npm run preview` | Sert le build de `dist/` localement |
| `npm run lint` | Vérification ESLint |
| `node scripts/fetch-fallback-data.mjs` | Régénère les données de repli `public/data/cards.json` |

Aucune variable d'environnement ni clé d'API n'est nécessaire : l'API TCGdex
est publique.

### Déploiement

`npm run build` produit un site entièrement statique dans `dist/`, à
publier sur n'importe quel hébergement de fichiers (Netlify, GitHub Pages…).
L'application n'a qu'une page et pas de routes : aucune règle de
redirection n'est nécessaire.

## Commandes de jeu

| | Clavier / souris | Écran tactile |
| --- | --- | --- |
| Marcher | ZQSD (AZERTY) ou WASD (QWERTY), flèches ; Maj pour courir | Joystick en bas à gauche |
| Regarder | Approcher la souris des bords de l'écran | Glisser le doigt sur la scène |
| Révéler une carte | Clic sur une étoile | Toucher une étoile |
| Tourner la carte | Glisser n'importe où | Glisser n'importe où |
| Fermer la carte | Échap, bouton ×, ou clic dans le vide | Bouton ×, ou toucher dans le vide |

## Structure du projet

```
public/
  data/cards.json          Repli local : 250 cartes complètes (API indisponible)
  models/Star…glb          Modèle 3D d'étoile (voir Crédits)
  manifest.webmanifest     Manifeste d'application (plein écran sur mobile)
scripts/
  fetch-fallback-data.mjs  Génère public/data/cards.json depuis l'API
src/
  main.jsx, App.jsx        Point d'entrée ; App orchestre données, scène,
                           révélation, compagnon et son
  index.css                Styles globaux et variables du style "cartoon"
  services/
    tcgdexApi.js           Accès à l'API TCGdex, avec repli sur le JSON local
  hooks/
    useCards.js            Sélection de 250 cartes, tirage de 50, Shuffle,
                           détail de la carte choisie
    useCardSearch.js       Recherche par nom dans toute la base (debounce)
    useCompanion.js        File de répliques du compagnon
    useSoundtrack.js       État du son pour React
    useIsTouch.js          Détecte l'usage tactile (dernier pointeur utilisé)
    useAutoFullscreen.js   Plein écran au premier toucher
    usePrefersReducedMotion.js
  components/
    IslandScene.jsx        Canvas 3D principal : île, ciel, caméra, joystick
    FloatingIsland.jsx     Sol de l'île, base rocheuse, rochers
    CameraController.jsx   Déplacement et regard à la première personne
    TouchJoystick.jsx      Joystick virtuel (tactile)
    SkyScene.jsx           Étoiles-cartes cliquables, champ d'étoiles, rotation
    ShootingStars.jsx      Étoiles filantes décoratives
    CardReveal.jsx         Overlay de révélation (second Canvas 3D)
    Card3D.jsx             Carte 3D : géométrie, dos dessiné, animation
    holoMaterial.js        Shader du reflet holographique
    PokeCompanion.jsx      Compagnon et sa bulle
    SearchBar.jsx          Recherche et Shuffle (repliés en boutons sur mobile)
    SoundControls.jsx      Lecteur : morceau suivant, musique, sourdine
  constants/
    world.js               Dimensions du monde (île, hauteur des yeux)
    rarities.js            Rareté TCGdex → intensité de l'effet holo
    companionLines.js      Répliques du compagnon
  audio/
    synth.js               Instruments synthétisés (Web Audio API)
    tracks.js              Les trois musiques de fond, composées en code
    sfx.js                 Bruitages
    soundtrack.js          Gestionnaire du son (singleton)
```

Chaque fichier commence par un commentaire d'en-tête qui décrit son rôle,
son comportement et ses props.

## Fonctionnement

`App` porte l'état de l'application et le distribue :

1. Au démarrage, `useCards` récupère **250 cartes en un seul appel**
   (`GET /cards`, résumé : id, nom, image) et en tire 50, qui deviennent les
   étoiles de `SkyScene`. Shuffle refait un tirage dans ces 250 cartes, sans
   nouvel appel réseau.
2. Une recherche (`useCardSearch`) interroge `GET /cards?name=…` après 300 ms
   sans frappe ; tant qu'elle est active, ses résultats remplacent le tirage
   dans le ciel.
3. Au clic sur une étoile, `useCards.selectCard` récupère le **détail de la
   carte** (`GET /cards/:id` : rareté, types, image). Pendant ce temps, le
   déplacement est bloqué, la barre de recherche masquée et la musique
   atténuée.
4. `CardReveal` affiche la carte dans un second Canvas, en overlay ; une fois
   la carte retournée, il prévient `App`, qui déclenche la réaction du
   compagnon et le scintillement sonore.
5. À la fermeture, tout revient à l'état d'exploration ; le ciel n'a pas
   changé.

Une réponse arrivée trop tard (autre carte demandée entre-temps, nouvelle
frappe dans la recherche) est ignorée.

## Choix techniques

### React, Vite, Three.js via React Three Fiber

La scène 3D est écrite en JSX avec
[`@react-three/fiber`](https://r3f.docs.pmnd.rs/) : les objets 3D sont des
composants comme le reste de l'interface, et partagent son état sans
passerelle. [`@react-three/drei`](https://drei.docs.pmnd.rs/) fournit les
briques courantes (chargement du modèle et des textures, champ d'étoiles,
rotation de la carte).

Ce qui change à chaque image (position de la caméra, joystick, animations)
passe par des `ref` et `useFrame`, sans état React : aucun nouveau rendu de
composant pendant le mouvement.

### Données : TCGdex, en peu d'appels

- `GET /cards` ne renvoie qu'un résumé : il suffit pour placer les étoiles,
  et le détail n'est chargé qu'au clic, pour la seule carte révélée.
- La recherche demande une carte de plus que le plafond affiché (51) pour
  savoir s'il en existe d'autres (« 50+ résultats ») sans tout télécharger.
- **Repli hors ligne** : si l'API est inaccessible, `tcgdexApi.js` se rabat
  sur `public/data/cards.json`. Ce fichier contient les mêmes 250 cartes que
  la sélection, avec leur détail complet, et est généré par
  `scripts/fetch-fallback-data.mjs`. La recherche filtre alors ce fichier
  par nom.
- **Images manquantes** : pour certaines cartes, le serveur d'images TCGdex
  envoie un en-tête CORS invalide (`Access-Control-Allow-Origin: *, *`) et le
  navigateur refuse l'image. Une *error boundary* autour de la texture
  affiche alors un recto de remplacement, au lieu de faire planter toute
  l'application.

### Étoiles anonymes et faciles à viser

Toutes les étoiles utilisent le même modèle 3D et ne donnent aucun indice
sur la carte qu'elles cachent : la découverte se fait à la révélation. Le
modèle tourne sur lui-même et, de profil, n'est qu'un mince filet : le clic
est donc capté par une sphère invisible un peu plus grande que l'étoile. Un
glisser du doigt de plus de 10 px qui se termine sur une étoile n'est pas
compté comme un clic.

### Déplacement à la première personne

- Les touches sont lues par position physique (`KeyboardEvent.code`) : ZQSD
  sur un clavier AZERTY et WASD sur un QWERTY fonctionnent sans réglage.
- Le regard suit la souris sans clic ni verrouillage du pointeur : le centre
  de l'écran est une zone morte (pour viser une étoile sereinement) et la vue
  tourne d'autant plus vite que la souris approche d'un bord. Le curseur
  reste libre pour cliquer.
- Sur tactile, le joystick et le regard au doigt suivent chacun leur propre
  doigt : on peut marcher et regarder en même temps.

### Révélation de la carte

- La carte est un rectangle à coins arrondis avec une fine tranche, aux
  proportions d'une vraie carte (63 × 88 mm).
- Le dos « Pocket Stars » et le recto de remplacement sont dessinés dans un
  canvas 2D puis utilisés comme textures : pas d'image de dos officielle,
  soumise à copyright.
- L'effet holographique est un shader en calque additif, qui réagit à
  l'angle de la carte. Son intensité dépend de la rareté TCGdex
  (`constants/rarities.js`) : rien pour les communes, holo classique,
  ultra-rare plus marqué.
- La carte tourne par un glisser n'importe où sur l'écran, et pas seulement
  sur la carte : vue de profil, elle échapperait sinon au doigt.

### Compagnon

Toutes les répliques sont dans `constants/companionLines.js`, séparées de
la logique. `useCompanion` gère une file de répliques affichées le temps
d'être lues, qu'une réaction peut interrompre. La réaction à la carte est
retardée jusqu'à ce qu'elle soit retournée, pour ne pas couper la réplique
du clic.

### Bande-son générée en code

La musique et les bruitages sont synthétisés avec la Web Audio API, sans
aucun fichier audio : pas de poids à télécharger ni de licence musicale à
gérer.

- Chaque musique est une grille d'accords sur laquelle les motifs
  (arpèges, mélodie) sont générés mesure par mesure, avec une part de
  hasard : elle ne se répète jamais à l'identique.
- Les notes sont programmées un peu en avance sur l'horloge audio
  (*lookahead*) : le rythme reste précis même si la page est occupée.
- Les navigateurs n'autorisent le son qu'après un geste de l'utilisateur :
  il démarre au premier clic, toucher ou touche du clavier.
- Les réglages (sourdine générale, musique coupée) sont mémorisés dans le
  `localStorage` du navigateur.

### Interface « cartoon » en CSS simple

Pas de framework CSS : un fichier CSS par composant, et des variables
partagées dans `index.css` (`--cartoon-ink`, `--cartoon-paper`…). Le style
repose sur des contours épais, une ombre pleine violette (une ombre sombre
se perdrait dans le ciel de nuit) et la police
[Fredoka](https://fonts.google.com/specimen/Fredoka).

### Mobile et tablette

- Le mode tactile suit le dernier pointeur utilisé : un ordinateur à écran
  tactile passe de l'un à l'autre selon qu'on touche l'écran ou qu'on
  clique.
- Les zones sûres (encoche, barre d'accueil) sont respectées
  (`viewport-fit=cover`, `env(safe-area-inset-*)`).
- La page passe en plein écran au premier toucher (Android, iPad). Sur
  iPhone, où Safari ne le permet pas, l'ajout à l'écran d'accueil ouvre
  l'application sans barre de navigateur, grâce au manifeste.

### Accessibilité

- Si le système demande de réduire les animations
  (`prefers-reduced-motion`), la rotation du ciel, les étoiles filantes et
  les animations du compagnon (flottement, apparition de la bulle) sont
  coupées.
- Les boutons ont des libellés pour les lecteurs d'écran et un contour de
  focus visible au clavier.

## Limites connues

- Le build produit un seul fichier JavaScript d'environ 1,2 Mo (350 Ko
  compressé), Three.js compris ; Vite signale qu'il dépasse 500 Ko. Il
  pourrait être découpé, par exemple en chargeant la révélation à la
  demande.
- Les cartes dont l'image est bloquée par TCGdex (en-tête CORS invalide)
  s'affichent avec le recto de remplacement.
- Sur iPhone, le plein écran passe par « Sur l'écran d'accueil ». L'icône
  sera alors une capture de la page : iOS demande une icône PNG, que le
  projet ne fournit pas encore.
- La bulle du compagnon remonte au-dessus du rappel des commandes grâce au
  sélecteur CSS `:has()`, absent de Safari avant iOS 15.4 : les deux
  peuvent s'y chevaucher pendant l'accueil.
- Pas de tests automatisés dans le dépôt.

## Crédits

- Données et images des cartes : [TCGdex](https://tcgdex.dev).
- Modèle 3D d'étoile : ["Star"](https://poly.pizza/m/CeJcPl217O) by J-Toastie,
  [CC-BY](https://creativecommons.org/licenses/by/3.0/), via
  [Poly Pizza](https://poly.pizza/m/CeJcPl217O).
- Illustration de Mimikyu : dépôt de sprites
  [PokeAPI](https://github.com/PokeAPI/sprites).
- Police [Fredoka](https://fonts.google.com/specimen/Fredoka), sous licence
  SIL Open Font License.

Pokémon et les noms, images et cartes associés sont des marques et des
œuvres de Nintendo, Creatures Inc. et GAME FREAK inc. Pocket Stars est un
projet étudiant non officiel, sans lien avec ces sociétés.
