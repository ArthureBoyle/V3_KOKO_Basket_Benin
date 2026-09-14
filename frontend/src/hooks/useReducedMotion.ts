import { useSyncExternalStore } from 'react'

// Le garde-fou CSS (styles/index.css) n'arrete que les animations CSS.
// Toute animation JavaScript (compteur anime, texte decode, bouton
// magnetique, inclinaison) doit lire ce hook et se desactiver si vrai.
// Suit aussi les changements en direct du reglage systeme.
const REQUETE = '(prefers-reduced-motion: reduce)'

function sAbonner(notifier: () => void) {
  const media = window.matchMedia(REQUETE)
  media.addEventListener('change', notifier)
  return () => media.removeEventListener('change', notifier)
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    sAbonner,
    () => window.matchMedia(REQUETE).matches,
    () => false,
  )
}
