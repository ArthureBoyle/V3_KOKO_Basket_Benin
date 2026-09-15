import { useSyncExternalStore } from 'react'
import { EVENEMENT_CHANGEMENT, lireAnimationsReduitesManuel } from '../theme/preferences'

// Le garde-fou CSS (styles/index.css) n'arrete que les animations CSS.
// Toute animation JavaScript (compteur anime, texte decode, bouton
// magnetique, inclinaison) doit lire ce hook et se desactiver si vrai.
//
// Deux sources, combinees en "ou" : le reglage systeme (suivi en direct),
// et le commutateur manuel de l'application (menu du compte), pour les PC
// faibles sur un systeme qui n'a pas ce reglage active.
const REQUETE = '(prefers-reduced-motion: reduce)'

function sAbonner(notifier: () => void) {
  const media = window.matchMedia(REQUETE)
  media.addEventListener('change', notifier)
  window.addEventListener(EVENEMENT_CHANGEMENT, notifier)
  return () => {
    media.removeEventListener('change', notifier)
    window.removeEventListener(EVENEMENT_CHANGEMENT, notifier)
  }
}

function lireEtat(): boolean {
  return window.matchMedia(REQUETE).matches || lireAnimationsReduitesManuel()
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(sAbonner, lireEtat, () => false)
}
