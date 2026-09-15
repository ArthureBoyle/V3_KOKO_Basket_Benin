import { useEffect, useRef } from 'react'

// Remplissage directionnel (menu lateral) : le cote par lequel le
// curseur entre determine le sens du remplissage — approche par la
// gauche, ca s'etend depuis la gauche ; approche par la droite, depuis
// la droite. Une seule mesure a l'entree (mouseenter), pas de suivi
// continu (mousemove) : contrairement a l'inclinaison (useEffetInclinaison),
// rien a recalculer pendant le survol, juste une direction fixee une fois.
// Pas de garde reduced-motion ici : la transition elle-meme est du CSS
// pur (scaleX au survol), deja couverte par le garde-fou global
// (styles/index.css) — cette fonction ne fait que choisir un cote, elle
// n'anime rien elle-meme.
export function useEffetDirectionnel<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const surEntree = (evenement: MouseEvent) => {
      const rect = element.getBoundingClientRect()
      const cote = evenement.clientX - rect.left < rect.width / 2 ? 'left' : 'right'
      element.style.setProperty('--origine-remplissage', cote)
    }

    element.addEventListener('mouseenter', surEntree)
    return () => element.removeEventListener('mouseenter', surEntree)
  }, [])

  return ref
}
