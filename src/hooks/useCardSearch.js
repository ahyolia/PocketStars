// useCardSearch.js
//
// Recherche de cartes par nom dans toute la base TCGdex (et non dans le
// seul tirage affiché), via le filtre `name` de GET /cards : correspondance
// partielle et insensible à la casse.
//
// Comportement :
//   - La requête part après une courte pause dans la frappe (debounce), pour
//     ne pas interroger l'API à chaque touche.
//   - Les résultats sont plafonnés à MAX_RESULTS (autant d'étoiles que le
//     ciel peut en afficher lisiblement) ; `hasMore` indique qu'il en existe
//     davantage.
//   - Une réponse arrivée après une nouvelle frappe est ignorée.
//   - Pendant une nouvelle recherche, les résultats précédents restent
//     affichés jusqu'à l'arrivée des suivants (pas de ciel vide qui clignote).
//
// Retourne : { results, loading, error, hasMore, active } — `active` est
// faux tant que la recherche est vide.

import { useEffect, useRef, useState } from "react";
import { fetchCards } from "../services/tcgdexApi";

const DEBOUNCE_MS = 300;
export const MAX_RESULTS = 50;

export function useCardSearch(query) {
  const trimmed = query.trim();
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  // Texte dont les résultats sont affichés : tant qu'il diffère du texte
  // tapé, une recherche est en attente ou en cours.
  const [completedQuery, setCompletedQuery] = useState("");
  const requestRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestRef.current;
    if (!trimmed) return;

    const timer = setTimeout(async () => {
      try {
        // Une carte de plus que le plafond : permet de savoir s'il y en a
        // d'autres sans tout télécharger.
        const { data } = await fetchCards({
          name: trimmed,
          "pagination:page": 1,
          "pagination:itemsPerPage": MAX_RESULTS + 1,
        });
        if (requestId !== requestRef.current) return;
        const list = Array.isArray(data) ? data : [];
        setResults(list.slice(0, MAX_RESULTS));
        setHasMore(list.length > MAX_RESULTS);
        setError(null);
      } catch (err) {
        if (requestId !== requestRef.current) return;
        setError(err);
        setResults([]);
        setHasMore(false);
      }
      setCompletedQuery(trimmed);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [trimmed]);

  const active = Boolean(trimmed);
  return {
    results: active ? results : [],
    loading: active && completedQuery !== trimmed,
    error: active ? error : null,
    hasMore: active && hasMore,
    active,
  };
}
