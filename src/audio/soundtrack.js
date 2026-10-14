// soundtrack.js
//
// Gestionnaire du son de l'application (singleton `soundtrack`) : musiques
// de fond générées (tracks.js) et bruitages (sfx.js), via la Web Audio API.
//
// Fonctionnement :
//   - Les navigateurs n'autorisent le son qu'après un geste de
//     l'utilisateur : le contexte audio est créé au premier clic, toucher ou
//     touche du clavier (init() pose les écouteurs).
//   - Graphe : morceau en cours → bus musique → sortie ; bruitages → bus
//     bruitages → sortie ; une réverbération partagée donne de l'espace aux
//     deux.
//   - Les morceaux sont programmés mesure par mesure, un peu en avance sur
//     l'horloge audio (lookahead) : le rythme reste précis même si le fil
//     principal est occupé. À la fin d'un morceau, le suivant enchaîne en
//     fondu croisé.
//   - Deux réglages, mémorisés dans le navigateur : sourdine générale
//     (muted) et musique coupée seule (musicMuted), qui garde les bruitages.
//   - Musique atténuée pendant la révélation d'une carte (setDucked) ; son
//     suspendu quand l'onglet est caché.
//
// L'état exposé ({ muted, musicMuted, trackIndex, unlocked }) se lit dans
// React avec useSoundtrack (hooks/useSoundtrack.js).

import { createReverb } from "./synth";
import { SFX } from "./sfx";
import { TRACKS } from "./tracks";

const MUTED_KEY = "pocketstars.audio.muted";
const MUSIC_MUTED_KEY = "pocketstars.audio.musicMuted";
const LOOKAHEAD = 0.6; // secondes de musique programmées d'avance
const TICK_MS = 100;
const CROSSFADE = 2.5; // secondes
const MUSIC_LEVEL = 0.6;
const DUCKED_LEVEL = 0.25;
const SFX_LEVEL = 1;
// Délai minimal entre deux occurrences d'un même bruitage (s), pour éviter
// les rafales (survol rapide de plusieurs étoiles…).
const SFX_MIN_INTERVAL = { starHover: 0.08, footstep: 0.15, companion: 0.2 };

function readFlag(key) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key, value) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // Stockage indisponible (navigation privée…) : le réglage ne sera
    // simplement pas mémorisé.
  }
}

class Soundtrack {
  state = {
    muted: readFlag(MUTED_KEY),
    musicMuted: readFlag(MUSIC_MUTED_KEY),
    trackIndex: 0,
    unlocked: false,
  };
  listeners = new Set();
  ctx = null;
  current = null; // { track, player, gain, bar, nextBarTime }
  timer = null;
  ducked = false;
  lastSfx = {};
  initialized = false;

  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = () => this.state;

  setState(patch) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  // Pose les écouteurs de déblocage et de visibilité (une seule fois).
  init() {
    if (this.initialized) return;
    this.initialized = true;
    const unlock = () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      this.unlock();
    };
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
    document.addEventListener("visibilitychange", () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else this.ctx.resume();
    });
  }

  unlock() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.state.muted ? 0 : 1;
    this.master.connect(ctx.destination);

    const reverb = createReverb(ctx);
    reverb.connect(this.master);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.ducked ? DUCKED_LEVEL : MUSIC_LEVEL;
    this.musicBus.connect(this.master);
    const musicSend = ctx.createGain();
    musicSend.gain.value = 0.45;
    this.musicBus.connect(musicSend).connect(reverb);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = SFX_LEVEL;
    this.sfxBus.connect(this.master);
    const sfxSend = ctx.createGain();
    sfxSend.gain.value = 0.25;
    this.sfxBus.connect(sfxSend).connect(reverb);

    ctx.resume();
    this.setState({ unlocked: true });
    this.updateMusic();
  }

  // La musique joue sauf en sourdine générale ou si elle est coupée seule.
  updateMusic() {
    if (!this.ctx) return;
    if (this.state.muted || this.state.musicMuted) this.stopMusic();
    else this.startMusic();
  }

  startMusic() {
    if (!this.ctx || this.timer) return;
    this.startTrack(this.state.trackIndex, false);
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  stopMusic() {
    clearInterval(this.timer);
    this.timer = null;
    this.fadeOutCurrent(0.4);
  }

  startTrack(index, crossfade) {
    const ctx = this.ctx;
    const track = TRACKS[index];
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(1, now + (crossfade ? CROSSFADE : 0.6));
    gain.connect(this.musicBus);
    this.current = {
      track,
      player: track.createPlayer(),
      gain,
      bar: 0,
      nextBarTime: now + 0.1,
    };
  }

  fadeOutCurrent(duration) {
    const old = this.current;
    this.current = null;
    if (!old) return;
    const now = this.ctx.currentTime;
    old.gain.gain.cancelScheduledValues(now);
    old.gain.gain.setValueAtTime(old.gain.gain.value, now);
    old.gain.gain.linearRampToValueAtTime(0, now + duration);
    // Les notes déjà programmées s'éteignent avec le fondu ; on débranche
    // ensuite le morceau.
    setTimeout(() => old.gain.disconnect(), (duration + 4) * 1000);
  }

  // Programme les mesures qui commencent dans la fenêtre d'avance.
  tick() {
    const ctx = this.ctx;
    const current = this.current;
    if (!current || ctx.state !== "running") return;
    // Après une pause (onglet caché…), on repart de maintenant plutôt que
    // de rattraper toutes les mesures en retard d'un coup.
    if (current.nextBarTime < ctx.currentTime) current.nextBarTime = ctx.currentTime + 0.05;

    const { track } = current;
    const barDuration = (60 / track.bpm) * track.beats;
    while (current.nextBarTime < ctx.currentTime + LOOKAHEAD) {
      if (current.bar >= track.bars) {
        this.nextTrack();
        return;
      }
      current.player(ctx, current.gain, current.bar, current.nextBarTime);
      current.bar += 1;
      current.nextBarTime += barDuration;
    }
  }

  nextTrack = () => {
    const trackIndex = (this.state.trackIndex + 1) % TRACKS.length;
    this.setState({ trackIndex });
    if (!this.ctx || !this.timer) return;
    this.fadeOutCurrent(CROSSFADE);
    this.startTrack(trackIndex, true);
  };

  // Sourdine générale : musique et bruitages.
  toggleMute = () => {
    const muted = !this.state.muted;
    writeFlag(MUTED_KEY, muted);
    this.setState({ muted });
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(muted ? 0 : 1, now, 0.08);
    this.updateMusic();
  };

  // Musique de fond seule : les bruitages restent actifs.
  toggleMusic = () => {
    const musicMuted = !this.state.musicMuted;
    writeFlag(MUSIC_MUTED_KEY, musicMuted);
    this.setState({ musicMuted });
    this.updateMusic();
  };

  // Musique atténuée (ex. pendant la révélation d'une carte).
  setDucked(ducked) {
    this.ducked = ducked;
    if (!this.ctx) return;
    this.musicBus.gain.setTargetAtTime(
      ducked ? DUCKED_LEVEL : MUSIC_LEVEL,
      this.ctx.currentTime,
      0.4
    );
  }

  // Joue un bruitage de sfx.js, sauf en sourdine ou avant déblocage.
  play(name, options) {
    const ctx = this.ctx;
    if (!ctx || this.state.muted || ctx.state !== "running") return;
    const now = ctx.currentTime;
    const minInterval = SFX_MIN_INTERVAL[name] ?? 0;
    if (now - (this.lastSfx[name] ?? -Infinity) < minInterval) return;
    this.lastSfx[name] = now;
    SFX[name]?.(ctx, this.sfxBus, now + 0.01, options);
  }
}

export const soundtrack = new Soundtrack();
export { TRACKS };
