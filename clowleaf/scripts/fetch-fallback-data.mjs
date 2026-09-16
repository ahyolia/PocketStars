// fetch-fallback-data.mjs
//
// Script exécuté côté Node (jamais soumis aux restrictions CORS du
// navigateur) pour récupérer l'intégralité des cartes de l'API Pokémon TCG
// et les écrire dans public/data/cards.json, afin de servir de repli local
// pour src/services/pokemonApi.js.
//
// Usage : node scripts/fetch-fallback-data.mjs

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const API_BASE_URL = "https://api.pokemontcg.io/v2";
const PAGE_SIZE = 60;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "public", "data", "cards.json");

async function fetchAllCards() {
  const allCards = [];
  let page = 1;

  while (true) {
    const url = `${API_BASE_URL}/cards?page=${page}&pageSize=${PAGE_SIZE}`;
    console.log(`Récupération de la page ${page}...`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Échec de la requête (page ${page}) : ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const items = Array.isArray(data) ? data : data.cards ?? data.data ?? [];

    if (!items.length) break;

    allCards.push(...items);

    if (items.length < PAGE_SIZE) break;
    page += 1;
  }

  return allCards;
}

async function main() {
  try {
    const cards = await fetchAllCards();
    await writeFile(OUTPUT_PATH, JSON.stringify(cards, null, 2), "utf-8");
    console.log(`${cards.length} cartes écrites dans ${OUTPUT_PATH}`);
  } catch (err) {
    console.error("Échec de la récupération des données depuis l'API :", err.message);
    process.exitCode = 1;
  }
}

main();
