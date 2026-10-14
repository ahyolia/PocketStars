// useAutoFullscreen.js
//
// Sur écran tactile, passe la page en plein écran au premier toucher, pour
// masquer la barre du navigateur et profiter de tout l'écran du téléphone.
// Les navigateurs n'autorisent le plein écran qu'en réponse à un geste de
// l'utilisateur : d'où l'attente du premier toucher.
//
// Une seule tentative par visite : si l'utilisateur quitte le plein écran,
// on ne le lui impose pas de nouveau. Sans effet là où l'API n'existe pas
// (Safari sur iPhone : passer par "Ajouter à l'écran d'accueil", cf.
// public/manifest.webmanifest) ou quand l'app est déjà lancée depuis
// l'écran d'accueil.

import { useEffect } from "react";

export function useAutoFullscreen() {
  useEffect(() => {
    const root = document.documentElement;
    const standalone = window.matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches;
    if (!root.requestFullscreen || !document.fullscreenEnabled || standalone) return;

    const onPointerDown = (e) => {
      if (e.pointerType === "mouse") return;
      window.removeEventListener("pointerdown", onPointerDown, true);
      if (document.fullscreenElement) return;
      root.requestFullscreen({ navigationUI: "hide" }).catch(() => {
        // Refusé (réglage du navigateur…) : on reste en mode normal.
      });
    };

    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, []);
}
