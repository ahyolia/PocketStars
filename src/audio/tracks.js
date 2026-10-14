// tracks.js
//
// Musiques de fond, composées en code : chaque morceau est une grille
// d'accords qui tourne en boucle, sur laquelle des motifs sont générés
// mesure par mesure, avec une part de hasard (arpèges, mélodie, étincelles)
// pour ne jamais rejouer exactement la même chose.
//
// Un morceau expose :
//   - id, title  : identifiant et titre affiché
//   - bpm, beats : tempo et nombre de temps par mesure
//   - bars       : nombre de mesures avant de passer au morceau suivant
//   - createPlayer() : renvoie scheduleBar(ctx, dest, barIndex, time), qui
//     programme toutes les notes d'une mesure commençant à `time`. Le
//     lecteur garde son propre état (dernière note de la mélodie…).

import { bass, bell, pad, pluck } from "./synth";

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const chance = (p) => Math.random() < p;

// Mélodie en mouvement conjoint : se déplace d'un ou deux degrés dans la
// gamme depuis la note précédente, et vise une note de l'accord sur les
// temps forts.
function createMelody(scale, start) {
  let index = scale.indexOf(start);
  return (chordTones, strong) => {
    if (strong && chance(0.7)) {
      const targets = scale
        .map((midi, i) => ({ midi, i }))
        .filter(({ midi }) => chordTones.includes(midi % 12));
      const nearest = targets.reduce((best, t) =>
        Math.abs(t.i - index) < Math.abs(best.i - index) ? t : best
      );
      index = nearest.i;
    } else {
      index += pick([-2, -1, -1, 1, 1, 2]);
      index = Math.max(0, Math.min(scale.length - 1, index));
    }
    return scale[index];
  };
}

// 1. Nuit étoilée — calme et rêveur : nappes, boîte à musique, étincelles.
const NIGHT_CHORDS = [
  [48, 52, 55, 59], // Cmaj7
  [45, 48, 52, 55], // Am7
  [41, 45, 48, 52], // Fmaj7
  [43, 47, 50, 52], // G6
];

const nightSky = {
  id: "night-sky",
  title: "Nuit étoilée",
  bpm: 66,
  beats: 4,
  bars: 48,
  createPlayer() {
    return (ctx, dest, bar, time) => {
      const beat = 60 / this.bpm;
      const chord = NIGHT_CHORDS[bar % NIGHT_CHORDS.length];
      pad(ctx, dest, time, chord.map((n) => n + 12), beat * 4, { gain: 0.035 });
      bass(ctx, dest, time, chord[0] - 12, beat * 2.5, { gain: 0.12 });

      // Arpège de boîte à musique, en croches, avec des silences.
      const tones = [...chord.map((n) => n + 24), chord[0] + 36];
      for (let step = 0; step < 8; step++) {
        if (step > 0 && !chance(0.55)) continue;
        bell(ctx, dest, time + step * beat * 0.5, pick(tones), { gain: 0.07 + Math.random() * 0.04 });
      }
      // Étincelle aiguë de temps en temps.
      if (chance(0.35)) {
        bell(ctx, dest, time + Math.floor(Math.random() * 16) * beat * 0.25, pick(tones) + 12, {
          gain: 0.04,
          decay: 2.4,
        });
      }
    };
  },
};

// 2. Berceuse de Mimikyu — valse à trois temps, un peu mélancolique.
const LULLABY_SCALE = [57, 59, 60, 62, 64, 65, 67, 68, 69, 71, 72, 74, 76]; // la mineur harmonique
const LULLABY_CHORDS = [
  { root: 45, tones: [9, 0, 4] }, // Am
  { root: 41, tones: [5, 9, 0] }, // F
  { root: 48, tones: [0, 4, 7] }, // C
  { root: 40, tones: [4, 8, 11] }, // E
];

const mimikyuLullaby = {
  id: "mimikyu-lullaby",
  title: "Berceuse de Mimikyu",
  bpm: 96,
  beats: 3,
  bars: 64,
  createPlayer() {
    const melody = createMelody(LULLABY_SCALE, 69);
    return (ctx, dest, bar, time) => {
      const beat = 60 / this.bpm;
      const { root, tones } = LULLABY_CHORDS[bar % LULLABY_CHORDS.length];
      bass(ctx, dest, time, root - 12, beat * 1.5, { gain: 0.13 });
      // "Poum-tchi-tchi" : accord léger sur les temps 2 et 3.
      const chordNotes = tones.map((t) => 60 + t);
      for (const offset of [1, 2]) {
        for (const midi of chordNotes) {
          pluck(ctx, dest, time + offset * beat, midi, { gain: 0.035, decay: 0.3 });
        }
      }
      // Mélodie à la boîte à musique : une note par temps, parfois deux.
      for (let b = 0; b < 3; b++) {
        bell(ctx, dest, time + b * beat, melody(tones, b === 0) + 12, { gain: 0.09, decay: 1.3 });
        if (b === 2 && chance(0.35)) {
          bell(ctx, dest, time + (b + 0.5) * beat, melody(tones, false) + 12, { gain: 0.07, decay: 1 });
        }
      }
    };
  },
};

// 3. Île flottante — ostinato pincé en ré dorien, mélodie pentatonique.
const ISLAND_CHORDS = [
  [50, 53, 57, 60], // Dm7
  [43, 47, 50, 55], // G
  [45, 48, 52, 55], // Am7
  [48, 52, 55, 59], // Cmaj7
];
const ISLAND_SCALE = [62, 64, 65, 67, 69, 72, 74, 76, 77, 79, 81];

const floatingIsland = {
  id: "floating-island",
  title: "Île flottante",
  bpm: 84,
  beats: 4,
  bars: 48,
  createPlayer() {
    const melody = createMelody(ISLAND_SCALE, 69);
    return (ctx, dest, bar, time) => {
      const beat = 60 / this.bpm;
      const chord = ISLAND_CHORDS[bar % ISLAND_CHORDS.length];
      pad(ctx, dest, time, chord.map((n) => n + 12), beat * 4, { gain: 0.025, brightness: 900 });
      bass(ctx, dest, time, chord[0] - 12, beat * 1.8, { gain: 0.12 });
      bass(ctx, dest, time + beat * 2, chord[0] - 12, beat * 1.5, { gain: 0.08 });

      // Ostinato en croches : fondamentale, quinte, octave, quinte…
      const pattern = [0, 2, 3, 2, 1, 2, 3, 2].map((i) => chord[i] + 12);
      pattern.forEach((midi, step) => {
        pluck(ctx, dest, time + step * beat * 0.5, midi, { gain: step % 2 ? 0.035 : 0.05 });
      });
      // Mélodie clairsemée : blanches et noires.
      const tones = chord.map((n) => n % 12);
      let t = 0;
      while (t < 4) {
        const length = pick([1, 1, 2]);
        if (chance(0.75)) {
          bell(ctx, dest, time + t * beat, melody(tones, t === 0), { gain: 0.08, decay: length * beat + 0.6 });
        }
        t += length;
      }
    };
  },
};

export const TRACKS = [nightSky, mimikyuLullaby, floatingIsland];
