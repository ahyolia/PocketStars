import { useMemo, useState } from 'react'
import IslandScene from './components/IslandScene'
import CardReveal from './components/CardReveal'
import SearchBar from './components/SearchBar'
import { useCards } from './hooks/useCards'

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

  // Filtre par nom, insensible à la casse, sur le tirage déjà chargé.
  const filteredCards = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return cards
    return cards.filter((card) => card.name?.toLowerCase().includes(query))
  }, [cards, search])

  return (
    <>
      <IslandScene
        cards={cards}
        visibleCards={filteredCards}
        onStarClick={selectCard}
      />
      <SearchBar
        value={search}
        onFilter={setSearch}
        cards={cards}
        matches={filteredCards.length}
      >
        <button type="button" onClick={shuffle}>
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
