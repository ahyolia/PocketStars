// synth.js
//
// Instruments synthétisés avec la Web Audio API (aucun fichier audio) :
// chaque fonction programme une note à l'instant `time` (horloge du
// contexte audio) et la relie à `dest`. Les nœuds se libèrent seuls une fois
// la note terminée.
//
// Utilisés par les morceaux (tracks.js) et les bruitages (sfx.js).

export function midiToFreq(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

// Enveloppe : montée linéaire, puis décroissance exponentielle vers le
// silence (une exponentielle ne peut pas atteindre 0, d'où 0.0001).
function envelope(param, time, peak, attack, decay) {
  param.setValueAtTime(0.0001, time);
  param.linearRampToValueAtTime(peak, time + attack);
  param.exponentialRampToValueAtTime(0.0001, time + attack + decay);
}

function osc(ctx, type, freq, time, stop, dest) {
  const node = ctx.createOscillator();
  node.type = type;
  node.frequency.setValueAtTime(freq, time);
  node.connect(dest);
  node.start(time);
  node.stop(stop);
  return node;
}

// Boîte à musique / clochette : fondamentale sinusoïdale et partiels aigus
// qui s'éteignent plus vite.
export function bell(ctx, dest, time, midi, { gain = 0.18, decay = 1.6 } = {}) {
  const freq = midiToFreq(midi);
  const out = ctx.createGain();
  envelope(out.gain, time, gain, 0.004, decay);
  out.connect(dest);
  osc(ctx, "sine", freq, time, time + decay + 0.1, out);

  const partial = ctx.createGain();
  envelope(partial.gain, time, 0.35, 0.002, decay * 0.35);
  partial.connect(out);
  osc(ctx, "sine", freq * 3.01, time, time + decay * 0.4, partial);
}

// Nappe : accord tenu, oscillateurs triangle légèrement désaccordés, filtrés
// pour rester doux, montée et extinction lentes.
export function pad(ctx, dest, time, midis, duration, { gain = 0.05, brightness = 1100 } = {}) {
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, time);
  out.gain.linearRampToValueAtTime(gain, time + Math.min(1.2, duration / 2));
  out.gain.setValueAtTime(gain, time + duration);
  out.gain.linearRampToValueAtTime(0.0001, time + duration + 1.4);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = brightness;
  filter.connect(out);
  out.connect(dest);

  const stop = time + duration + 1.5;
  for (const midi of midis) {
    const freq = midiToFreq(midi);
    osc(ctx, "triangle", freq, time, stop, filter).detune.value = -6;
    osc(ctx, "triangle", freq, time, stop, filter).detune.value = 7;
  }
}

// Basse ronde.
export function bass(ctx, dest, time, midi, duration, { gain = 0.16 } = {}) {
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, time);
  out.gain.linearRampToValueAtTime(gain, time + 0.03);
  out.gain.exponentialRampToValueAtTime(gain * 0.4, time + duration * 0.6);
  out.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.3);
  out.connect(dest);
  osc(ctx, "sine", midiToFreq(midi), time, time + duration + 0.35, out);
}

// Note pincée courte (ostinato), triangle filtré.
export function pluck(ctx, dest, time, midi, { gain = 0.08, decay = 0.45 } = {}) {
  const out = ctx.createGain();
  envelope(out.gain, time, gain, 0.005, decay);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(3200, time);
  filter.frequency.exponentialRampToValueAtTime(700, time + decay);
  filter.connect(out);
  out.connect(dest);
  osc(ctx, "triangle", midiToFreq(midi), time, time + decay + 0.1, filter);
}

// Petit son carré façon jeu rétro (voix du compagnon, interface).
export function blip(ctx, dest, time, freq, { gain = 0.05, duration = 0.06, type = "square", slideTo } = {}) {
  const out = ctx.createGain();
  envelope(out.gain, time, gain, 0.004, duration);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 2600;
  filter.connect(out);
  out.connect(dest);
  const node = osc(ctx, type, freq, time, time + duration + 0.05, filter);
  if (slideTo) node.frequency.exponentialRampToValueAtTime(slideTo, time + duration);
}

// Bruit blanc partagé (2 s), réutilisé par toutes les sources de bruit.
const noiseBuffers = new WeakMap();
function getNoiseBuffer(ctx) {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buffer);
  }
  return buffer;
}

// Bruit filtré, dont le filtre peut glisser (souffle, pas, froissement).
export function noise(
  ctx,
  dest,
  time,
  duration,
  { gain = 0.1, type = "bandpass", from = 800, to = from, q = 1, attack = 0.01 } = {}
) {
  const source = ctx.createBufferSource();
  source.buffer = getNoiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, time);
  filter.frequency.exponentialRampToValueAtTime(to, time + duration);
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, time);
  out.gain.linearRampToValueAtTime(gain, time + attack);
  out.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  source.connect(filter).connect(out).connect(dest);
  source.start(time, Math.random() * 1.5);
  source.stop(time + duration + 0.05);
}

// Réverbération : réponse impulsionnelle générée (bruit qui s'éteint), en
// stéréo légèrement décorrélée pour l'impression d'espace.
export function createReverb(ctx, seconds = 2.8) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.4;
    }
  }
  const convolver = ctx.createConvolver();
  convolver.buffer = impulse;
  return convolver;
}
