import type { ReactNode } from 'react'
import type { TonBadge } from './Badge'

interface CarteStatutProps {
  ton?: TonBadge
  enfant?: never
  children: ReactNode
  className?: string
}

// Carte a accent de statut : liseret gauche colore selon le meme "ton" que
// les badges (Badge.tsx) — primaire = a venir/neutre, succes = en cours/
// victoire, alerte = en attente d'action, danger = urgent/defaite. Meme
// logique de couleur des deux cotes, pas un systeme separe.
//
// PAS ENCORE UTILISEE (aucun ecran a cartes n'existe : les listes
// actuelles — Comptes — sont des tableaux, un choix delibere de
// l'architecture pour des donnees denses). Prete pour la liste des
// tournois / matchs de la phase suivante.
const CLASSES_TON: Record<TonBadge, string> = {
  neutre: 'border-l-secondary',
  primaire: 'border-l-primary',
  succes: 'border-l-success',
  alerte: 'border-l-warning',
  danger: 'border-l-danger',
}

export function CarteStatut({ ton = 'neutre', children, className = '' }: CarteStatutProps) {
  return (
    <div
      className={`rounded-r-xl rounded-l-sm border border-l-2 border-border bg-surface p-4 transition-[border-color,transform] duration-200 hover:border-primary hover:translate-x-0.5 ${CLASSES_TON[ton]} ${className}`}
    >
      {children}
    </div>
  )
}
