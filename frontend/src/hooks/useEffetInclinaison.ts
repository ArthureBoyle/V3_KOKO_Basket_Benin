import { useEffect, useRef } from 'react'
import { useReducedMotion } from './useReducedMotion'

const PROFONDEUR = 600 // perspective, px
// Amplitudes maximales en degres : au-dela, l'inclinaison devient
// caricaturale plutot que subtile (retenu apres essai).
const AMPLITUDE_X = 9
const AMPLITUDE_Y = 11

// Inclinaison 3D au survol (motion system) : l'element pivote selon la
// position exacte du curseur dessus, comme s'il avait du poids et suivait
// la main. Meme throttling rAF (une execution par frame) et meme garde
// reduced-motion que useEffetMagnetique — jamais actif si l'utilisateur a
// reduit les animations (systeme ou commutateur manuel du menu du compte).
export function useEffetInclinaison<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const mouvementReduit = useReducedMotion()

  useEffect(() => {
    const element = ref.current
    if (!element || mouvementReduit) return

    let enAttente = false
    let cible = { rotateX: 0, rotateY: 0 }

    const appliquer = () => {
      element.style.transform = `perspective(${PROFONDEUR}px) rotateX(${cible.rotateX}deg) rotateY(${cible.rotateY}deg)`
      enAttente = false
    }
    const surMouvement = (evenement: MouseEvent) => {
      const rect = element.getBoundingClientRect()
      cible = {
        rotateX: ((evenement.clientY - rect.top) / rect.height - 0.5) * -AMPLITUDE_X,
        rotateY: ((evenement.clientX - rect.left) / rect.width - 0.5) * AMPLITUDE_Y,
      }
      if (!enAttente) {
        enAttente = true
        requestAnimationFrame(appliquer)
      }
    }
    const surSortie = () => {
      element.style.transform = `perspective(${PROFONDEUR}px) rotateX(0deg) rotateY(0deg)`
    }

    element.addEventListener('mousemove', surMouvement)
    element.addEventListener('mouseleave', surSortie)
    return () => {
      element.removeEventListener('mousemove', surMouvement)
      element.removeEventListener('mouseleave', surSortie)
      element.style.transform = ''
    }
  }, [mouvementReduit])

  return ref
}
