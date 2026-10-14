// useSoundtrack.js
//
// Accès React au gestionnaire de son (audio/soundtrack.js) : renvoie son
// état ({ muted, musicMuted, trackIndex, unlocked }), le titre du morceau en
// cours et les commandes (toggleMute, toggleMusic, nextTrack). Le rendu suit
// les changements d'état.

import { useSyncExternalStore } from "react";
import { soundtrack, TRACKS } from "../audio/soundtrack";

export function useSoundtrack() {
  const state = useSyncExternalStore(soundtrack.subscribe, soundtrack.getState);
  return {
    ...state,
    trackTitle: TRACKS[state.trackIndex].title,
    toggleMute: soundtrack.toggleMute,
    toggleMusic: soundtrack.toggleMusic,
    nextTrack: soundtrack.nextTrack,
  };
}
