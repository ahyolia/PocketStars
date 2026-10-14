import { useCallback, useState } from 'react'
import IslandScene from './components/IslandScene'
import CardReveal from './components/CardReveal'
import PokeCompanion from './components/PokeCompanion'
import SearchBar from './components/SearchBar'
import { useCards } from './hooks/useCards'
import { MAX_RESULTS, useCardSearch } from './hooks/useCardSearch'
import { useCompanion } from './hooks/useCompanion'
import { useAutoFullscreen } from './hooks/useAutoFullscreen'
import {
  ERROR_LINES,
  STAR_CLICK_LINES,
  getRevealLine,
  pickRandom,
} from './constants/companionLines'

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

  useAutoFullscreen()

  const [search, setSearch] = useState('')
  const searchResults = useCardSearch(search)
  const companion = useCompanion()
  const { say, silence } = companion

  // Réactions du compagnon : au clic sur une étoile, puis à la révélation
  // de la carte (ou à l'échec de son chargement).
  const handleStarClick = useCallback(
    async (id) => {
      say(pickRandom(STAR_CLICK_LINES))
      const loaded = await selectCard(id)
      if (loaded === false) say(pickRandom(ERROR_LINES))
    },
    [say, selectCard]
  )
  const handleRevealed = useCallback((card) => say(getRevealLine(card)), [say])
  const handleCloseReveal = useCallback(() => {
    silence()
    clearSelectedCard()
  }, [silence, clearSelectedCard])

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
        onStarClick={handleStarClick}
        controlsEnabled={!isRevealOpen}
      />
      <SearchBar
        value={search}
        onFilter={setSearch}
        status={searchStatus}
        hidden={isRevealOpen}
      >
        <button type="button" onClick={handleShuffle}>
          Shuffle
        </button>
      </SearchBar>
      <CardReveal
        card={selectedCard}
        loading={selectedCardLoading}
        error={selectedCardError}
        onClose={handleCloseReveal}
        onRevealed={handleRevealed}
      />
      <PokeCompanion
        message={companion.message}
        messageKey={companion.messageKey}
        onNext={companion.next}
      />
    </>
  )
}

export default App
