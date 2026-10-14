// useIsTouch.js
//
// Indique si l'utilisateur se sert d'un écran tactile (doigt ou stylet)
// plutôt que d'une souris, pour adapter les commandes affichées (joystick,
// rappel des gestes).
//
// Valeur initiale : le pointeur principal de l'appareil (media query
// `pointer: coarse`). Ensuite, elle suit le dernier pointeur utilisé : un
// ordinateur tactile bascule d'un mode à l'autre selon qu'on touche l'écran
// ou qu'on clique.

import { useSyncExternalStore } from "react";

let isTouch =
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
const listeners = new Set();

function onPointerDown(e) {
  const touch = e.pointerType !== "mouse";
  if (touch === isTouch) return;
  isTouch = touch;
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  if (listeners.size === 0) {
    window.addEventListener("pointerdown", onPointerDown, true);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("pointerdown", onPointerDown, true);
    }
  };
}

export function useIsTouch() {
  return useSyncExternalStore(subscribe, () => isTouch, () => false);
}
