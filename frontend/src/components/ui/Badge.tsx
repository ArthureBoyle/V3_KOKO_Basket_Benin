import type { ReactNode } from 'react'
import type { StatutMatch, StatutTournoi } from '../../types/api'

export type TonBadge = 'neutre' | 'primaire' | 'succes' | 'alerte' | 'danger'

// Fond tres translucide + bordure discrete + texte dans le token : jamais
// un aplat sature. Les opacites (/12, /30) passent par les tokens de theme
// (Tailwind color-mix), donc restent correctes dans les 3 themes — jamais
// de rgba(...) code en dur, qui figerait la couleur violette partout.
const CLASSES_TON: Record<TonBadge, string> = {
  neutre: 'border-border bg-elevated text-text-mute',
  primaire: 'border-primary-text/30 bg-primary-text/12 text-primary-text',
  succes: 'border-success/30 bg-success/12 text-success',
  alerte: 'border-warning/30 bg-warning/12 text-warning',
  danger: 'border-danger/30 bg-danger/12 text-danger',
}

interface BadgeProps {
  ton?: TonBadge
  // Point qui pulse : une action est attendue (plafond 3-4 par ecran).
  pulse?: boolean
  children: ReactNode
}

export function Badge({ ton = 'neutre', pulse = false, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs font-medium whitespace-nowrap ${CLASSES_TON[ton]}`}
    >
      {pulse && <span aria-hidden="true" className="point-pulse size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

// Libelles et couleurs des 5 etats d'un match (motion system, section 1).
// TERMINE reste neutre : Victoire / Defaite ne concerne que le joueur connecte.
const STATUTS_MATCH: Record<StatutMatch, { libelle: string; ton: TonBadge; pulse?: boolean }> = {
  A_VENIR: { libelle: 'À venir', ton: 'neutre' },
  EN_RETARD: { libelle: 'Score attendu', ton: 'alerte', pulse: true },
  REPORTE: { libelle: 'Reporté', ton: 'alerte' },
  TERMINE: { libelle: 'Terminé', ton: 'neutre' },
  ANNULE: { libelle: 'Annulé', ton: 'danger' },
}

const STATUTS_TOURNOI: Record<StatutTournoi, { libelle: string; ton: TonBadge }> = {
  A_VENIR: { libelle: 'À venir', ton: 'primaire' },
  ACTIF: { libelle: 'En cours', ton: 'succes' },
  TERMINE: { libelle: 'Terminé', ton: 'neutre' },
  ANNULE: { libelle: 'Annulé', ton: 'danger' },
}

export function BadgeStatutMatch({ statut }: { statut: StatutMatch }) {
  const { libelle, ton, pulse } = STATUTS_MATCH[statut]
  return (
    <Badge ton={ton} pulse={pulse}>
      {libelle}
    </Badge>
  )
}

export function BadgeStatutTournoi({ statut }: { statut: StatutTournoi }) {
  const { libelle, ton } = STATUTS_TOURNOI[statut]
  return <Badge ton={ton}>{libelle}</Badge>
}
