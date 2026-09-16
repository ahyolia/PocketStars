// tcgdexApi.js
//
// Couche d'accès à l'API TCGdex (https://api.tcgdex.net/v2/en).
// Endpoints utilisés :
//   - GET /cards      -> liste des cartes, filtrable via des query params
//                        transmis tels quels (ex. name, pagination:page,
//                        pagination:itemsPerPage)
//   - GET /cards/:id  -> détail d'une carte par son identifiant
//
// Contrairement à l'ancienne API Pokémon TCG, les réponses TCGdex ne sont
// PAS enveloppées dans { data: [...] } : /cards renvoie directement un
// tableau et /cards/:id renvoie directement l'objet carte.
//
// En cas de blocage CORS ou d'indisponibilité de l'API, repli local sur
// public/data/cards.json.

const API_BASE_URL = "https://api.tcgdex.net/v2/en";

export async function fetchCards(filters = {}) {
  try {
    const params = new URLSearchParams(filters);
    const query = params.toString();
    const url = `${API_BASE_URL}/cards${query ? `?${query}` : ""}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Réponse API invalide : ${response.status}`);
    }

    const data = await response.json();
    return { data, source: "api" };
  } catch (err) {
    console.warn("CORS bloqué ou API indisponible, bascule sur le JSON local", err);

    const fallbackResponse = await fetch("/data/cards.json");
    const fallbackData = await fallbackResponse.json();
    return { data: fallbackData, source: "fallback" };
  }
}

export async function fetchCardById(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/cards/${id}`);

    if (!response.ok) {
      throw new Error(`Réponse API invalide : ${response.status}`);
    }

    const data = await response.json();
    return { data, source: "api" };
  } catch (err) {
    console.warn("CORS bloqué ou API indisponible, bascule sur le JSON local", err);

    const fallbackResponse = await fetch("/data/cards.json");
    const fallbackData = await fallbackResponse.json();
    const card = Array.isArray(fallbackData)
      ? fallbackData.find((c) => c.id === id)
      : undefined;
    return { data: card, source: "fallback" };
  }
}
