import IslandScene from './components/IslandScene'
import CardReveal from './components/CardReveal'
import { useCards } from './hooks/useCards'

function App() {
  // shuffle sera câblé sur un contrôle visuel dans une étape ultérieure.
  const {
    cards,
    selectedCard,
    selectedCardLoading,
    selectedCardError,
    selectCard,
    clearSelectedCard,
  } = useCards()

  return (
    <>
      <IslandScene cards={cards} onStarClick={selectCard} />
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
