# Pocket Stars

Pocket Stars is an interactive 3D exploration of Pokémon cards. The player
walks in first person across a floating island, under a night sky where
every star hides a card. Clicking a star brings it down and reveals the card
in 3D, with commentary from Mimikyu, the companion. Card data comes from the
public [TCGdex](https://tcgdex.dev) API.

**Live demo: <https://pocketstarss.netlify.app>**

The interface and the companion's lines are in French.

## Features

- **First-person island**: move with the keyboard (ZQSD/WASD or arrow keys,
  Shift to run) and look around with the mouse, no click needed; on touch
  screens, a virtual joystick and drag-to-look.
- **A sky of cards**: 50 stars drawn at random from a selection of 250
  cards; the Shuffle button draws again.
- **Search by name across the whole TCGdex database**, with the results
  becoming the stars in the sky (50 at most).
- **3D reveal**: the card arrives face down and spinning, flips over, then
  can be rotated with the mouse or a finger. Rare cards get a holographic
  sheen whose intensity depends on their rarity.
- **Companion** (Mimikyu): a welcome monologue, and reactions when a star is
  clicked, when a card is revealed (based on its rarity, category or type)
  and when something goes wrong.
- **Soundtrack generated in code**: three background tracks, sound effects
  (stars, reveal, companion voice, footsteps, interface), and the option to
  mute everything or only the music.
- **Responsive**: phone (portrait and landscape), tablet, desktop;
  fullscreen on mobile.

## Requirements

- [Node.js](https://nodejs.org/) `^20.19` or `>= 22.12` (required by Vite 8)
- npm

## Installation and running

```bash
npm install
npm run dev
```

The app is then served at <http://localhost:5173>.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build into `dist/` (static site) |
| `npm run preview` | Serves the `dist/` build locally |
| `npm run lint` | ESLint check |
| `node scripts/fetch-fallback-data.mjs` | Regenerates the fallback data in `public/data/cards.json` |

No environment variables or API keys are needed: the TCGdex API is public.

### Deployment

`npm run build` produces a fully static site in `dist/`, which can be
published on any static file host (Netlify, GitHub Pages…). The app is a
single page with no routes, so no redirect rules are needed.

## Controls

| | Keyboard / mouse | Touch screen |
| --- | --- | --- |
| Walk | ZQSD (AZERTY) or WASD (QWERTY), arrow keys; Shift to run | Joystick, bottom left |
| Look around | Move the mouse toward the edges of the screen | Drag a finger across the scene |
| Reveal a card | Click a star | Tap a star |
| Rotate the card | Drag anywhere | Drag anywhere |
| Close the card | Escape, the × button, or click on empty space | The × button, or tap on empty space |

## Project structure

```
public/
  data/cards.json          Local fallback: 250 full cards (when the API is down)
  models/Star…glb          3D star model (see Credits)
  manifest.webmanifest     App manifest (fullscreen on mobile)
scripts/
  fetch-fallback-data.mjs  Generates public/data/cards.json from the API
src/
  main.jsx, App.jsx        Entry point; App orchestrates data, scene,
                           reveal, companion and sound
  index.css                Global styles and the "cartoon" style variables
  services/
    tcgdexApi.js           TCGdex API access, with the local JSON fallback
  hooks/
    useCards.js            250-card selection, 50-card draw, Shuffle,
                           details of the selected card
    useCardSearch.js       Name search across the whole database (debounced)
    useCompanion.js        Queue of the companion's lines
    useSoundtrack.js       Sound state for React
    useIsTouch.js          Detects touch usage (last pointer used)
    useAutoFullscreen.js   Fullscreen on first touch
    usePrefersReducedMotion.js
  components/
    IslandScene.jsx        Main 3D canvas: island, sky, camera, joystick
    FloatingIsland.jsx     Island ground, rocky base, rocks
    CameraController.jsx   First-person movement and look
    TouchJoystick.jsx      Virtual joystick (touch)
    SkyScene.jsx           Clickable card stars, star field, rotation
    ShootingStars.jsx      Decorative shooting stars
    CardReveal.jsx         Reveal overlay (a second 3D canvas)
    Card3D.jsx             3D card: geometry, drawn back, animation
    holoMaterial.js        Holographic sheen shader
    PokeCompanion.jsx      Companion and speech bubble
    SearchBar.jsx          Search and Shuffle (collapsed into buttons on mobile)
    SoundControls.jsx      Player: next track, music, mute
  constants/
    world.js               World dimensions (island, eye height)
    rarities.js            TCGdex rarity → holographic effect intensity
    companionLines.js      The companion's lines
  audio/
    synth.js               Synthesized instruments (Web Audio API)
    tracks.js              The three background tracks, composed in code
    sfx.js                 Sound effects
    soundtrack.js          Sound manager (singleton)
```

Every file starts with a header comment (in French) describing its role,
its behavior and its props.

## How it works

`App` holds the application state and passes it down:

1. On startup, `useCards` fetches **250 cards in a single request**
   (`GET /cards`, summary only: id, name, image) and draws 50 of them, which
   become the stars of `SkyScene`. Shuffle draws again from those 250 cards,
   with no new network request.
2. A search (`useCardSearch`) queries `GET /cards?name=…` once typing has
   paused for 300 ms; while it is active, its results replace the draw in
   the sky.
3. When a star is clicked, `useCards.selectCard` fetches the **card
   details** (`GET /cards/:id`: rarity, types, image). Meanwhile, movement
   is locked, the search bar is hidden and the music is lowered.
4. `CardReveal` shows the card in a second canvas, as an overlay; once the
   card has flipped over, it notifies `App`, which triggers the companion's
   reaction and the sparkle sound.
5. On close, everything returns to the exploration state; the sky is
   unchanged.

A response that arrives too late (another card requested in the meantime,
or a new keystroke in the search) is ignored.

## Technical choices

### React, Vite, and Three.js through React Three Fiber

The 3D scene is written in JSX with
[`@react-three/fiber`](https://r3f.docs.pmnd.rs/): 3D objects are components
like the rest of the interface and share its state without any bridge.
[`@react-three/drei`](https://drei.docs.pmnd.rs/) provides the common
building blocks (model and texture loading, star field, card rotation).

Anything that changes every frame (camera position, joystick, animations)
goes through `ref`s and `useFrame`, not React state: no component re-renders
during movement.

### Data: TCGdex, with few requests

- `GET /cards` only returns a summary: enough to place the stars, and the
  details are loaded on click, for the revealed card only.
- The search asks for one card more than the displayed cap (51) to know
  whether more exist ("50+ résultats") without downloading everything.
- **Offline fallback**: if the API is unreachable, `tcgdexApi.js` falls
  back to `public/data/cards.json`. This file holds the same 250 cards as
  the selection, with their full details, and is generated by
  `scripts/fetch-fallback-data.mjs`. Searches then filter this file by name.
- **Missing images**: for some cards, the TCGdex image server sends an
  invalid CORS header (`Access-Control-Allow-Origin: *, *`) and the browser
  rejects the image. An *error boundary* around the texture then shows a
  replacement front, instead of crashing the whole app.

### Anonymous stars that are easy to hit

All stars use the same 3D model and give no hint about the card they hide:
the discovery happens at the reveal. The model spins and, seen edge-on, is
only a thin sliver, so clicks are caught by an invisible sphere slightly
larger than the star. A finger drag of more than 10 px that ends on a star
does not count as a click.

### First-person movement

- Keys are read by physical position (`KeyboardEvent.code`): ZQSD on an
  AZERTY keyboard and WASD on a QWERTY one both work with no setting.
- The view follows the mouse with no click and no pointer lock: the center
  of the screen is a dead zone (so a star can be aimed at calmly) and the
  view turns faster the closer the mouse gets to an edge. The cursor stays
  free for clicking.
- On touch screens, the joystick and drag-to-look each track their own
  finger: you can walk and look around at the same time.

### Card reveal

- The card is a rounded rectangle with a thin edge, in the proportions of a
  real card (63 × 88 mm).
- The "Pocket Stars" back and the replacement front are drawn on a 2D
  canvas and used as textures: there is no official card-back image, which
  is copyrighted.
- The holographic effect is an additive shader layer that reacts to the
  card's angle. Its intensity depends on the TCGdex rarity
  (`constants/rarities.js`): none for commons, classic holo, stronger for
  ultra-rares.
- The card rotates when dragging anywhere on the screen, not only on the
  card itself: seen edge-on, it would otherwise slip out from under the
  finger.

### Companion

All lines live in `constants/companionLines.js`, separate from the logic.
`useCompanion` manages a queue of lines, each shown long enough to be read,
which a reaction can interrupt. The reaction to the card is delayed until it
has flipped over, so it does not cut off the click line.

### Soundtrack generated in code

Music and sound effects are synthesized with the Web Audio API, with no
audio files at all: nothing to download and no music license to manage.

- Each track is a chord progression on which patterns (arpeggios, melody)
  are generated bar by bar, with some randomness: it never repeats exactly.
- Notes are scheduled slightly ahead of the audio clock (*lookahead*): the
  rhythm stays accurate even when the page is busy.
- Browsers only allow sound after a user gesture: it starts on the first
  click, tap or key press.
- Settings (mute everything, mute the music) are saved in the browser's
  `localStorage`.

### "Cartoon" interface in plain CSS

No CSS framework: one CSS file per component, and shared variables in
`index.css` (`--cartoon-ink`, `--cartoon-paper`…). The style relies on thick
outlines, a solid purple drop shadow (a dark one would be lost against the
night sky) and the [Fredoka](https://fonts.google.com/specimen/Fredoka)
font.

### Mobile and tablet

- Touch mode follows the last pointer used: a touch-screen laptop switches
  between the two depending on whether you touch the screen or click.
- Safe areas (notch, home indicator) are respected (`viewport-fit=cover`,
  `env(safe-area-inset-*)`).
- The page goes fullscreen on first touch (Android, iPad). On iPhone, where
  Safari does not allow it, adding the app to the home screen opens it
  without the browser bar, thanks to the manifest.

### Accessibility

- If the system asks for reduced motion (`prefers-reduced-motion`), the sky
  rotation, the shooting stars and the companion's animations (floating,
  bubble pop-in) are turned off.
- Buttons have labels for screen readers and a visible keyboard focus
  outline.

## Known limitations

- The build produces a single JavaScript file of about 1.2 MB (350 KB
  gzipped), Three.js included; Vite warns that it exceeds 500 KB. It could
  be split, for example by loading the reveal on demand.
- Cards whose image is blocked by TCGdex (invalid CORS header) are shown
  with the replacement front.
- On iPhone, fullscreen requires "Add to Home Screen". The icon will then
  be a screenshot of the page: iOS needs a PNG icon, which the project does
  not provide yet.
- The companion's bubble moves above the controls hint thanks to the CSS
  `:has()` selector, which Safari lacks before iOS 15.4: the two may overlap
  there during the welcome monologue.
- No automated tests in the repository.

## Credits

- Card data and images: [TCGdex](https://tcgdex.dev).
- 3D star model: ["Star"](https://poly.pizza/m/CeJcPl217O) by J-Toastie,
  [CC-BY](https://creativecommons.org/licenses/by/3.0/), via
  [Poly Pizza](https://poly.pizza/m/CeJcPl217O).
- Mimikyu artwork: the [PokeAPI](https://github.com/PokeAPI/sprites) sprite
  repository.
- [Fredoka](https://fonts.google.com/specimen/Fredoka) font, under the SIL
  Open Font License.

Pokémon and the related names, images and cards are trademarks and works of
Nintendo, Creatures Inc. and GAME FREAK inc. Pocket Stars is an unofficial
student project, not affiliated with these companies.
