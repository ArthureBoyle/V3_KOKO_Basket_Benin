import type { TonBadge } from '../../components/ui/Badge'
import { BadgeStatutMatch } from '../../components/ui/Badge'
import { CarteStatut } from '../../components/ui/CarteStatut'
import { EtatVide } from '../../components/ui/EtatVide'
import { SqueletteLignes } from '../../components/ui/Squelette'
import { messageErreurApi } from '../../lib/erreurs'
import { formaterHeureMatch, formaterJourMatch } from '../../lib/format'
import type { MatchJoueur, StatutMatch } from '../../types/api'
import { useMesMatchsJoueur } from './api'

const TONS_STATUT: Record<StatutMatch, TonBadge> = {
  A_VENIR: 'primaire',
  EN_RETARD: 'alerte',
  REPORTE: 'alerte',
  TERMINE: 'neutre',
  ANNULE: 'danger',
}

// Le ton d'un match TERMINE reflete VICTOIRE/DEFAITE de l'equipe du
// joueur (voir CarteStatut : succes = victoire, danger = defaite) —
// jamais juste "termine" (neutre), qui n'interesserait pas le joueur
// autant que le resultat lui-meme. Match nul impossible au basket, mais
// couvert par prudence (retombe sur neutre).
function tonMatch(match: MatchJoueur, monEquipeId: number | null): TonBadge {
  if (match.statut !== 'TERMINE' || monEquipeId === null || match.score1 === null || match.score2 === null) {
    return TONS_STATUT[match.statut]
  }
  const jeSuisEquipe1 = match.equipe1Id === monEquipeId
  const jeSuisEquipe2 = match.equipe2Id === monEquipeId
  if (!jeSuisEquipe1 && !jeSuisEquipe2) return TONS_STATUT.TERMINE
  const monScore = jeSuisEquipe1 ? match.score1 : match.score2
  const scoreAdverse = jeSuisEquipe1 ? match.score2 : match.score1
  if (monScore > scoreAdverse) return 'succes'
  if (monScore < scoreAdverse) return 'danger'
  return 'neutre'
}

export function OngletCalendrierJoueur({ tournoiId, monEquipeId }: { tournoiId: number; monEquipeId: number | null }) {
  const { data: matchs, isLoading, isError, error } = useMesMatchsJoueur(tournoiId)

  if (isLoading) return <SqueletteLignes lignes={4} />
  if (isError) {
    return (
      <p role="alert" className="text-sm text-danger">
        {messageErreurApi(error)}
      </p>
    )
  }
  if (!matchs || matchs.length === 0) {
    return <EtatVide titre="Aucun match" description="Le calendrier de ce tournoi n'est pas encore publié." />
  }

  return (
    <div className="flex flex-col gap-2.5">
      {matchs.map((match) => (
        <CarteStatut key={match.id} ton={tonMatch(match, monEquipeId)}>
          <p className="font-mono text-2xs tracking-wide text-text-mute uppercase">
            {match.type} · {formaterJourMatch(match.date)} · {formaterHeureMatch(match.date)} · {match.lieu}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
            <p className="font-medium">
              <span className={match.equipe1Id === monEquipeId ? 'text-primary-text' : ''}>{match.equipe1.nom}</span>{' '}
              <span className="text-text-mute">vs</span>{' '}
              <span className={match.equipe2Id === monEquipeId ? 'text-primary-text' : ''}>{match.equipe2.nom}</span>
            </p>
            <div className="flex items-center gap-3">
              {match.score1 !== null && match.score2 !== null && (
                <span className="tabular-nums font-medium">
                  {match.score1} – {match.score2}
                </span>
              )}
              <BadgeStatutMatch statut={match.statut} />
            </div>
          </div>
        </CarteStatut>
      ))}
    </div>
  )
}
