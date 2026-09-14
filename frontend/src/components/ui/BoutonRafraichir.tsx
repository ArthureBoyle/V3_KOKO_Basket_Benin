import { useEffect, useState } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { formaterMiseAJour } from '../../lib/format'
import { Ballon } from './Ballon'

interface BoutonRafraichirProps {
  // isFetching de TanStack Query : la requete tourne.
  enCours: boolean
  onRafraichir: () => void
  // dataUpdatedAt de TanStack Query (timestamp en ms).
  derniereMiseAJour?: number
}

// Ballon de rafraichissement (motion system, section 6) :
// - tourne AU MOINS 1,4 s : un tour dure 1,4 s et on ne s'arrete qu'a la
//   fin d'un tour complet, donc jamais de clignotement illisible ;
// - CONTINUE tant que la requete tourne ;
// - s'arrete sur un tour complet : les coutures reviennent a leur place, pas de saut.
// Mouvement reduit : pas d'animation, l'etat suit simplement la requete.
export function BoutonRafraichir({ enCours, onRafraichir, derniereMiseAJour }: BoutonRafraichirProps) {
  const mouvementReduit = useReducedMotion()
  const [tourne, setTourne] = useState(enCours)
  const [enCoursPrecedent, setEnCoursPrecedent] = useState(enCours)
  const [maintenant, setMaintenant] = useState(() => Date.now())

  // Un rafraichissement lance ailleurs (retour sur l'onglet...) fait aussi
  // tourner le ballon. Ajuste pendant le rendu quand "enCours" change (motif
  // recommande par React) plutot que dans un effet, qui ferait un rendu de plus.
  if (enCours !== enCoursPrecedent) {
    setEnCoursPrecedent(enCours)
    if (enCours) setTourne(true)
  }

  // Le texte "il y a N min" avance tout seul.
  useEffect(() => {
    const minuterie = window.setInterval(() => setMaintenant(Date.now()), 30_000)
    return () => window.clearInterval(minuterie)
  }, [])

  const actif = mouvementReduit ? enCours : tourne || enCours

  const finDeTour = () => {
    if (!enCours) setTourne(false)
  }

  return (
    <div className="flex items-center gap-3">
      {derniereMiseAJour !== undefined && derniereMiseAJour > 0 && (
        <span className="text-xs text-text-mute">{formaterMiseAJour(derniereMiseAJour, maintenant)}</span>
      )}
      <button
        type="button"
        onClick={() => {
          if (!mouvementReduit) setTourne(true)
          onRafraichir()
        }}
        aria-label="Rafraîchir"
        aria-busy={actif}
        className="rounded-full p-1.5 transition-colors duration-150 hover:bg-elevated"
      >
        <Ballon mode={actif && !mouvementReduit ? 'rafraichit' : 'arret'} onFinTour={finDeTour} className="size-7" />
      </button>
    </div>
  )
}
