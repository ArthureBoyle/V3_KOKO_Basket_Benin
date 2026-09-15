import { useId, type ReactNode } from 'react'
import type { MotifFond } from '../theme/motifFond'

interface FondMotifProps {
  motif: MotifFond
}

// Texture de fond, un vrai <svg> (pas une data-URI CSS figee) : le trait
// lit "currentColor", herite du "color" pose sur le <svg> lui-meme via
// style={{ color: 'var(--border)' }} — exactement comme le degrade du
// Ballon (voir Ballon.tsx). UNE SEULE version sert les 3 themes : pas
// besoin de generer une variante par theme, une variable CSS ne
// s'interpole pas dans une data-URI mais s'applique tres bien a un <svg>
// du DOM. Premier enfant du layout (pas de z-index) : peint EN DESSOUS
// des elements suivants par simple ordre du DOM, sans risque de finir
// derriere le fond de la page (piege classique du z-index negatif).
export function FondMotif({ motif }: FondMotifProps) {
  const id = useId()
  const idMotif = `motif-fond-${id}`

  return (
    <svg
      aria-hidden="true"
      // Une texture de fond doit rester une texture : a peine perceptible,
      // jamais assez forte pour rivaliser avec le texte ou les controles.
      // Opacite PAR MOTIF, pas une valeur unique : le contour simple d'un
      // ballon a besoin de plus de contraste pour rester identifiable
      // qu'un quadrillage dense de losanges a la meme opacite.
      className="pointer-events-none fixed inset-0 size-full"
      style={{ color: 'var(--border)', opacity: OPACITES[motif] }}
    >
      <defs>
        <pattern id={idMotif} patternUnits="userSpaceOnUse" {...TAILLES[motif]}>
          {CONTENUS[motif]}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${idMotif})`} />
    </svg>
  )
}

// Valeurs ajustees a l'oeil (0.08 : aucun des 3 ne se voyait ; 0.35 rend
// losange/terrain nettement visibles sans redevenir envahissants comme la
// toute premiere version a 0.4 ; ballons, motif plus epars, a besoin de
// davantage — voir le commentaire au-dessus de OPACITES precedemment).
const OPACITES: Record<MotifFond, number> = {
  losange: 0.35,
  ballons: 0.45,
  terrain: 0.35,
}

const TAILLES: Record<MotifFond, { width: number; height: number }> = {
  losange: { width: 40, height: 40 },
  ballons: { width: 48, height: 48 },
  terrain: { width: 60, height: 60 },
}

// Tissage — deux losanges imbriques (motif textile ouest-africain),
// trait fin de 0.6px.
const Losange = (
  <g fill="none" stroke="currentColor" strokeWidth="0.6">
    <path d="M0 20L20 0l20 20-20 20z" />
    <path d="M10 20l10-10 10 10-10 10z" />
  </g>
)

// Ballon simplifie : juste les coutures, sans le degrade (une texture de
// fond reste plate/discrete — le volume est reserve au vrai bouton).
const Ballon = (
  <g fill="none" stroke="currentColor" strokeWidth="1">
    <circle cx="24" cy="24" r="15" />
    <path d="M9 24h30M24 9v30M13 13c6 6 6 16 0 22M35 13c-6 6-6 16 0 22" />
  </g>
)

// Terrain — carre de raquette avec un cercle central, ligne de fond
// continue : evoque les lignes peintes d'un terrain de basket.
const Terrain = (
  <g fill="none" stroke="currentColor" strokeWidth="1">
    <path d="M0 0h60M0 60h60M0 0v60M60 0v60" />
    <rect x="15" y="15" width="30" height="30" />
    <circle cx="30" cy="30" r="9" />
  </g>
)

const CONTENUS: Record<MotifFond, ReactNode> = {
  losange: Losange,
  ballons: Ballon,
  terrain: Terrain,
}
