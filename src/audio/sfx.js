// sfx.js
//
// Bruitages, synthétisés à la volée (synth.js). Chaque recette programme
// ses notes à partir de `time` et reçoit d'éventuelles options.

import { blip, bell, midiToFreq, noise, pluck } from "./synth";

const vary = (amount) => 1 + (Math.random() * 2 - 1) * amount;

export const SFX = {
  // Survol d'une étoile : tintement aigu et discret.
  starHover(ctx, dest, time) {
    bell(ctx, dest, time, 96 + Math.floor(Math.random() * 3) * 2, { gain: 0.06, decay: 0.6 });
  },

  // Clic sur une étoile : deux notes ascendantes.
  starClick(ctx, dest, time) {
    bell(ctx, dest, time, 84, { gain: 0.1, decay: 0.8 });
    bell(ctx, dest, time + 0.08, 91, { gain: 0.1, decay: 1.2 });
  },

  // Carte qui tournoie en arrivant : souffle qui monte.
  revealWhoosh(ctx, dest, time) {
    noise(ctx, dest, time, 1.3, { gain: 0.45, type: "bandpass", from: 300, to: 2400, q: 1.4, attack: 0.5 });
  },

  // Carte retournée : arpège scintillant, plus long et plus brillant pour les
  // cartes rares (strength : intensité holo, 0 à 1).
  revealSparkle(ctx, dest, time, { strength = 0 } = {}) {
    const notes = strength >= 1
      ? [72, 76, 79, 84, 88, 91, 96, 100]
      : strength > 0
        ? [72, 76, 79, 84, 88, 91]
        : [72, 76, 79, 84];
    notes.forEach((midi, i) => {
      bell(ctx, dest, time + i * 0.06, midi, { gain: 0.08, decay: 1.4 + i * 0.1 });
    });
    if (strength > 0) {
      noise(ctx, dest, time + 0.1, 1.6, { gain: 0.05 * (1 + strength), type: "highpass", from: 6000, to: 9000 });
    }
  },

  // Voix du compagnon : quelques "blips" de hauteur variable, comme des
  // syllabes (nombre selon la longueur de la réplique).
  companion(ctx, dest, time, { length = 40 } = {}) {
    const count = Math.min(7, 2 + Math.floor(length / 20));
    for (let i = 0; i < count; i++) {
      const freq = midiToFreq(74 + Math.floor(Math.random() * 7)) * vary(0.02);
      blip(ctx, dest, time + i * 0.075, freq, { gain: 0.07, duration: 0.05 });
    }
  },

  // Pas sur le sol de l'île : bruit sourd et court (plus marqué en courant).
  footstep(ctx, dest, time, { run = false } = {}) {
    noise(ctx, dest, time, 0.12, {
      gain: run ? 0.5 : 0.35,
      type: "lowpass",
      from: 500 * vary(0.2),
      to: 180,
      attack: 0.005,
    });
  },

  // Shuffle : glissando ascendant de notes pincées.
  shuffle(ctx, dest, time) {
    [60, 64, 67, 72, 76, 79].forEach((midi, i) => {
      pluck(ctx, dest, time + i * 0.035, midi + 12, { gain: 0.06, decay: 0.3 });
    });
  },

  // Fermeture de la carte : "pop" descendant.
  close(ctx, dest, time) {
    blip(ctx, dest, time, 880, { gain: 0.12, duration: 0.12, type: "triangle", slideTo: 440 });
  },

  // Clic d'interface générique : "pop" bref.
  click(ctx, dest, time) {
    blip(ctx, dest, time, 660, { gain: 0.12, duration: 0.06, type: "triangle", slideTo: 990 });
  },

  // Erreur : deux notes descendantes.
  error(ctx, dest, time) {
    blip(ctx, dest, time, midiToFreq(67), { gain: 0.09, duration: 0.14, type: "triangle" });
    blip(ctx, dest, time + 0.16, midiToFreq(62), { gain: 0.09, duration: 0.22, type: "triangle" });
  },
};
