import { useCallback, useState } from 'react'
import { lireMotifFond, memoriserMotifFond, type MotifFond } from '../theme/motifFond'

export function useMotifFond() {
  const [motif, setMotif] = useState<MotifFond>(lireMotifFond)

  const changerMotif = useCallback((nouveau: MotifFond) => {
    memoriserMotifFond(nouveau)
    setMotif(nouveau)
  }, [])

  return { motif, changerMotif }
}
