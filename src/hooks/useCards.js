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
//   - `selectCard(id)` récupère le détail complet d'une carte (types, image,
//     rareté…) avec un loading/error dédiés, indépendants de ceux de la pool.
//   - `clearSelectedCard()` referme la carte sélectionnée.
//
// Retourne : { cards, loading, error, shuffle, selectedCard,
//              selectedCardLoading, selectedCardError, selectCard,
//              clearSelectedCard }

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchCards, fetchCardById } from "../services/tcgdexApi";

const POOL_SIZE = 250;
const DISPLAY_SIZE = 50;

function pickRandomSubset(pool, count) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function useCards() {
  const [pool, setPool] = useState([]);
  const [displayedCards, setDisplayedCards] = useState([]);
  // Initialisé à true : le chargement de la pool démarre dès le montage, ce
  // qui évite un setLoading(true) synchrone dans l'effet.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedCardLoading, setSelectedCardLoading] = useState(false);
  const [selectedCardError, setSelectedCardError] = useState(null);
  // Numéro de la dernière requête de détail : permet d'ignorer une réponse
  // arrivée après un autre clic ou après une fermeture.
  const selectRequestRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

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

  const selectCard = useCallback(async (id) => {
    const requestId = ++selectRequestRef.current;
    const isLatest = () => requestId === selectRequestRef.current;

    setSelectedCard(null);
    setSelectedCardError(null);
    setSelectedCardLoading(true);

    try {
      const { data } = await fetchCardById(id);
      if (!data) throw new Error(`Carte introuvable : ${id}`);
      if (isLatest()) setSelectedCard(data);
    } catch (err) {
      if (isLatest()) setSelectedCardError(err);
    } finally {
      if (isLatest()) setSelectedCardLoading(false);
    }
  }, []);

  const clearSelectedCard = useCallback(() => {
    selectRequestRef.current++;
    setSelectedCard(null);
    setSelectedCardError(null);
    setSelectedCardLoading(false);
  }, []);

  return {
    cards: displayedCards,
    loading,
    error,
    shuffle,
    selectedCard,
    selectedCardLoading,
    selectedCardError,
    selectCard,
    clearSelectedCard,
  };
}
