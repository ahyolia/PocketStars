// useCards.js
//
// Hook React chargé d'appeler src/services/tcgdexApi.js pour constituer une
// "pool" de cartes légères et exposer un sous-ensemble tiré aléatoirement.
//
// Comportement :
//   - Au montage, un seul appel réseau récupère une pool de 250 cartes,
//     gardée en mémoire (state interne).
//   - `displayedCards` est un sous-ensemble de 50 cartes tiré aléatoirement
//     dans la pool (sans doublons).
//   - `shuffle()` re-tire un nouveau sous-ensemble de 50 cartes depuis la
//     pool déjà en mémoire, sans nouvel appel réseau.
//
// Retourne : { cards, loading, error, selectedCard, shuffle }

import { useState, useEffect, useCallback } from "react";
import { fetchCards } from "../services/tcgdexApi";

const POOL_SIZE = 250;
const DISPLAY_SIZE = 50;

function pickRandomSubset(pool, count) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function useCards() {
  const [pool, setPool] = useState([]);
  const [displayedCards, setDisplayedCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCard] = useState(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    fetchCards({ "pagination:page": 1, "pagination:itemsPerPage": POOL_SIZE })
      .then(({ data }) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setPool(list);
        setDisplayedCards(pickRandomSubset(list, DISPLAY_SIZE));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const shuffle = useCallback(() => {
    setDisplayedCards(pickRandomSubset(pool, DISPLAY_SIZE));
  }, [pool]);

  return { cards: displayedCards, loading, error, selectedCard, shuffle };
}
