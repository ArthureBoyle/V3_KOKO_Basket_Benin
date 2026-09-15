import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useEffetInclinaison } from '../../hooks/useEffetInclinaison'

interface Props {
  to: string
  children: ReactNode
}

// Chip de retour, partagee par toutes les fiches (Comptes, Tournois...) :
// un seul endroit a faire evoluer plutot qu'un className duplique dans
// chaque fiche — memes effets que les carreaux (remplissage + inclinaison
// 3D), pour que "le bouton qu'on retrouve un peu partout" soit VRAIMENT
// le meme composant partout, pas une classe recopiee qui finit par diverger.
export function LienRetour({ to, children }: Props) {
  const inclinaison = useEffetInclinaison<HTMLAnchorElement>()

  return (
    <Link
      ref={inclinaison}
      to={to}
      className="effet-remplissage effet-remplissage-primaire inline-flex w-fit items-center gap-1.5 rounded-md border border-border bg-elevated px-3 py-1.5 text-sm text-text-mute transition-[transform,border-color] duration-[250ms] ease-[cubic-bezier(0.2,0.8,0.3,1)]"
    >
      <span aria-hidden="true" className="contenu-remplissage">
        ←
      </span>
      <span className="contenu-remplissage">{children}</span>
    </Link>
  )
}
