import { useState } from 'react'
import IslandScene from './components/IslandScene'
import CardReveal from './components/CardReveal'
import SearchBar from './components/SearchBar'
import { useCards } from './hooks/useCards'
import { MAX_RESULTS, useCardSearch } from './hooks/useCardSearch'

function App() {
  const {
    cards,
    shuffle,
    selectedCard,
    selectedCardLoading,
    selectedCardError,
    selectCard,
    clearSelectedCard,
  } = useCards()

  const [search, setSearch] = useState('')
  const searchResults = useCardSearch(search)

  // Recherche en cours : le ciel affiche les résultats trouvés dans toute la
  // base ; sinon, le tirage aléatoire.
  const skyCards = searchResults.active ? searchResults.results : cards

  let searchStatus = null
  if (searchResults.active) {
    if (searchResults.loading) searchStatus = 'Recherche…'
    else if (searchResults.error) searchStatus = 'Erreur'
    else if (searchResults.hasMore) searchStatus = `${MAX_RESULTS}+ résultats`
    else searchStatus = `${searchResults.results.length} résultat${searchResults.results.length > 1 ? 's' : ''}`
  }

  // Shuffle : nouveau tirage, et retour au ciel aléatoire.
  const handleShuffle = () => {
    setSearch('')
    shuffle()
  }

  // Pas de déplacement dans la scène pendant la révélation d'une carte.
  const isRevealOpen = Boolean(selectedCard || selectedCardLoading || selectedCardError)

  return (
    <>
      <IslandScene
        cards={skyCards}
        onStarClick={selectCard}
        controlsEnabled={!isRevealOpen}
      />
      <SearchBar
        value={search}
        onFilter={setSearch}
        status={searchStatus}
      >
        <button type="button" onClick={handleShuffle}>
          Shuffle
        </button>
      </SearchBar>
      <CardReveal
        card={selectedCard}
        loading={selectedCardLoading}
        error={selectedCardError}
        onClose={clearSelectedCard}
      />
    </>
  )
}

export default App
