import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { Ballon } from '../components/ui/Ballon'
import { useEffetMagnetique } from '../hooks/useEffetMagnetique'

interface Props {
  cheminAccueil: string
}

// Logo cliquable de la sidebar : KO — ballon — KO, le ballon comme
// SEPARATEUR entre les deux syllabes (jamais une icone plaquee devant le
// mot). Le second "KO" est en miroir horizontal (scaleX(-1)) : les deux
// syllabes s'ecartent du ballon central, symetriques.
// - Coutures du ballon : meme <Ballon mode="rafraichit"> que
//   BoutonRafraichir (pas un mecanisme separe) — tournent pendant
//   isFetching, le degrade du cercle reste fixe.
// - Survol : effet MAGNETIQUE (translation pure vers le curseur), jamais
//   d'inclinaison — useEffetMagnetique, deja utilise sur les CTA
//   principaux, gere aussi le garde reduced-motion.
// - Clic : accueil du role + refetch des requetes actives (meme portee
//   que BoutonRafraichir, sur un geste different : "retour au tableau de
//   bord, avec des donnees a jour").
export function Logo({ cheminAccueil }: Props) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const nombreEnCours = useIsFetching()
  const magnetique = useEffetMagnetique<HTMLButtonElement>(true)

  const cliquer = () => {
    navigate(cheminAccueil)
    queryClient.refetchQueries({ type: 'active' })
  }

  return (
    <button
      ref={magnetique}
      type="button"
      onClick={cliquer}
      className="inline-flex w-fit items-center transition-transform duration-[180ms] ease-[cubic-bezier(0.2,0.8,0.3,1)]"
    >
      <span className="text-[32px] leading-none font-semibold italic">KO</span>
      <Ballon mode={nombreEnCours > 0 ? 'rafraichit' : 'arret'} className="mx-[3px] size-7" />
      <span className="text-[32px] leading-none font-semibold italic [transform:scaleX(-1)]">KO</span>
    </button>
  )
}
