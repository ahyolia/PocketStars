// useCompanion.js
//
// État de la parole du compagnon (PokeCompanion) : une suite de répliques
// affichées l'une après l'autre dans sa bulle, chacune le temps d'être lue.
//
// Comportement :
//   - Au montage, le monologue d'accueil démarre après une courte pause.
//   - `say(lines)` remplace ce qui est en cours (une réaction interrompt le
//     monologue d'accueil) ; `lines` peut être une réplique ou un tableau.
//   - `next()` passe à la réplique suivante sans attendre (clic sur la
//     bulle) ; `silence()` referme la bulle.
//
// Retourne : { message, messageKey, say, next, silence } — `message` vaut
// null quand le compagnon se tait ; `messageKey` change à chaque réplique
// (pour rejouer l'animation d'apparition).

import { useCallback, useEffect, useState } from "react";
import { INTRO_LINES } from "../constants/companionLines";

const INTRO_DELAY_MS = 1200;
// Durée d'affichage : un socle, plus un temps de lecture par caractère.
const BASE_DURATION_MS = 2200;
const PER_CHAR_MS = 45;

let speechId = 0;

export function useCompanion() {
  // { lines, index, id } ou null quand le compagnon se tait.
  const [speech, setSpeech] = useState(null);

  const say = useCallback((lines) => {
    const list = Array.isArray(lines) ? lines : [lines];
    setSpeech(list.length ? { lines: list, index: 0, id: ++speechId } : null);
  }, []);

  const next = useCallback(() => {
    setSpeech((current) =>
      current && current.index + 1 < current.lines.length
        ? { ...current, index: current.index + 1 }
        : null
    );
  }, []);

  const silence = useCallback(() => setSpeech(null), []);

  // Monologue d'accueil.
  useEffect(() => {
    const timer = setTimeout(() => say(INTRO_LINES), INTRO_DELAY_MS);
    return () => clearTimeout(timer);
  }, [say]);

  // Passage automatique à la réplique suivante (ou silence à la fin).
  const message = speech ? speech.lines[speech.index] : null;
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(next, BASE_DURATION_MS + message.length * PER_CHAR_MS);
    return () => clearTimeout(timer);
  }, [speech, message, next]);

  return {
    message,
    messageKey: speech ? `${speech.id}-${speech.index}` : null,
    say,
    next,
    silence,
  };
}
