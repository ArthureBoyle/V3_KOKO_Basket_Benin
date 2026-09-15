import { useEffect, useRef } from 'react'
import { useReducedMotion } from './useReducedMotion'

// Bouton magnetique (motion system, section 9) : suit legerement le
// curseur, cree une sensation de reactivite avant meme le clic. Reserve a
// UNE SEULE action principale par ecran — jamais generalise a tous les
// boutons (voir Bouton.tsx, prop "magnetique" explicite).
//
// Ecoute throttlee a une execution par frame (section "Optimisation
// obligatoire pour les effets curseur") : sans ca, une page avec plusieurs
// elements qui ecoutent tous mousemove peut saccader sur une machine ancienne.
export function useEffetMagnetique<T extends HTMLElement>(actif: boolean) {
  const ref = useRef<T>(null)
  const mouvementReduit = useReducedMotion()

  useEffect(() => {
    const element = ref.current
    if (!element || !actif || mouvementReduit) return

    let enAttente = false
    let cible = { x: 0, y: 0 }

    const appliquer = () => {
      element.style.transform = `translate(${cible.x}px, ${cible.y}px)`
      enAttente = false
    }
    const surMouvement = (evenement: MouseEvent) => {
      const rect = element.getBoundingClientRect()
      cible = {
        x: (evenement.clientX - (rect.left + rect.width / 2)) * 0.28,
        y: (evenement.clientY - (rect.top + rect.height / 2)) * 0.4,
      }
      if (!enAttente) {
        enAttente = true
        requestAnimationFrame(appliquer)
      }
    }
    const surSortie = () => {
      cible = { x: 0, y: 0 }
      element.style.transform = 'translate(0, 0)'
    }

    element.addEventListener('mousemove', surMouvement)
    element.addEventListener('mouseleave', surSortie)
    return () => {
      element.removeEventListener('mousemove', surMouvement)
      element.removeEventListener('mouseleave', surSortie)
      element.style.transform = ''
    }
  }, [actif, mouvementReduit])

  return ref
}
