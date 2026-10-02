// fetch-fallback-data.mjs
//
// Script exécuté côté Node (jamais soumis aux restrictions CORS du
// navigateur) pour récupérer des cartes complètes depuis l'API TCGdex et les
// écrire dans public/data/cards.json, afin de servir de repli local pour
// src/services/tcgdexApi.js.
//
// L'endpoint /cards de TCGdex ne renvoie qu'un résumé (id, localId, name,
// image) : le script récupère donc la même liste que la pool de useCards
// (page 1, POOL_SIZE cartes), puis le détail de chaque carte via
// /cards/:id (rareté, types, etc.), avec une concurrence limitée.
//
// Usage : node scripts/fetch-fallback-data.mjs

import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const API_BASE_URL = "https://api.tcgdex.net/v2/en/cards";
// Doit rester aligné avec POOL_SIZE dans src/hooks/useCards.js, pour que les
// identifiants du repli correspondent aux étoiles affichées.
const POOL_SIZE = 250;
const CONCURRENCY = 8;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "public", "data", "cards.json");

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Échec de la requête ${url} : ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function fetchCardList() {
  const params = new URLSearchParams({
    "pagination:page": 1,
    "pagination:itemsPerPage": POOL_SIZE,
  });
  return fetchJson(`${API_BASE_URL}?${params}`);
}

async function fetchCardDetails(list) {
  const details = new Array(list.length);
  let next = 0;
  let done = 0;

  async function worker() {
    while (next < list.length) {
      const index = next++;
      const { id } = list[index];
      try {
        details[index] = await fetchJson(`${API_BASE_URL}/${encodeURIComponent(id)}`);
      } catch (err) {
        console.warn(`Détail indisponible pour ${id}, carte ignorée : ${err.message}`);
      }
      done += 1;
      if (done % 25 === 0 || done === list.length) {
        console.log(`Détails récupérés : ${done}/${list.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return details.filter(Boolean);
}

async function main() {
  try {
    const list = await fetchCardList();
    console.log(`${list.length} cartes dans la liste, récupération des détails...`);
    const cards = await fetchCardDetails(list);

    await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await writeFile(OUTPUT_PATH, JSON.stringify(cards, null, 2), "utf-8");
    console.log(`${cards.length} cartes écrites dans ${OUTPUT_PATH}`);
  } catch (err) {
    console.error("Échec de la récupération des données depuis l'API :", err.message);
    process.exitCode = 1;
  }
}

main();
