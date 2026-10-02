import { useCallback } from 'react'
import IslandScene from './components/IslandScene'
import { useCards } from './hooks/useCards'

function App() {
  // shuffle sera câblé sur un contrôle visuel dans une étape ultérieure.
  // eslint-disable-next-line no-unused-vars
  const { cards, shuffle } = useCards()

  const handleStarClick = useCallback((id) => {
    console.log('Étoile cliquée :', id)
  }, [])

  return <IslandScene cards={cards} onStarClick={handleStarClick} />
}

export default App
