import type { ReactNode } from 'react'
import { useEffetInclinaison } from '../../hooks/useEffetInclinaison'

// Case delimitee (jamais une simple paire label/valeur qui flotte dans une
// grille) : chaque information a son propre cadre visuel, partage par
// toute l'app (fiche tournoi, dashboard admin...) — un seul endroit a
// faire evoluer plutot qu'une copie par ecran.
// - effet-remplissage(-primaire) : calque plein qui se deploie au survol
//   (styles/index.css), sur TOUS les carreaux, cliquables ou non.
// - useEffetInclinaison : inclinaison 3D qui suit le curseur, EN PLUS du
//   remplissage — les deux tournent ensemble sur le meme carreau (le
//   calque, pseudo-element du carreau, s'incline avec lui).
// - centrer : les valeurs courtes (nombres, texte court) flottaient dans
//   un coin sur une case bien plus large qu'elles ; les valeurs longues
//   restent alignees a gauche, plus lisibles ainsi.
// role="button"/tabIndex/onKeyDown plutot qu'un <button> : le meme
// element porte AUSSI la ref d'inclinaison, un seul type de noeud DOM
// evite de dupliquer le hook pour deux types de ref (div vs button).
export function Carreau({
  libelle,
  children,
  onClick,
  centrer = false,
}: {
  libelle: string
  children: ReactNode
  onClick?: () => void
  centrer?: boolean
}) {
  const inclinaison = useEffetInclinaison<HTMLDivElement>()
  const interactif = onClick !== undefined

  return (
    <div
      ref={inclinaison}
      role={interactif ? 'button' : undefined}
      tabIndex={interactif ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactif
          ? (evenement) => {
              if (evenement.key === 'Enter' || evenement.key === ' ') {
                evenement.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      className={`effet-remplissage effet-remplissage-primaire rounded-lg border border-border bg-elevated px-4 py-3 transition-[transform,border-color] duration-[250ms] ease-[cubic-bezier(0.2,0.8,0.3,1)] ${interactif ? 'cursor-pointer' : ''} ${centrer ? 'flex flex-col items-center justify-center text-center' : 'text-left'}`}
    >
      <div className="contenu-remplissage">
        <p className="text-2xs font-medium tracking-[0.08em] text-text-mute uppercase">{libelle}</p>
        <p className="mt-1 text-base font-medium">{children}</p>
      </div>
    </div>
  )
}
