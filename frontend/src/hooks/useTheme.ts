import { useCallback, useState } from 'react'
import { appliquerTheme, lireTheme, type Theme } from '../theme/theme'

// Pour le selecteur de theme : garde la valeur affichee synchronisee
// avec l'attribut data-theme reellement applique.
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(lireTheme)

  const changerTheme = useCallback((nouveau: Theme) => {
    appliquerTheme(nouveau)
    setTheme(nouveau)
  }, [])

  return { theme, changerTheme }
}
