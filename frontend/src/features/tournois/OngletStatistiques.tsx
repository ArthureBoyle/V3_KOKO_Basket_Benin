import { useState } from 'react'
import { CarteStatut } from '../../components/ui/CarteStatut'
import { EtatVide } from '../../components/ui/EtatVide'
import { SqueletteLignes } from '../../components/ui/Squelette'
import { messageErreurApi } from '../../lib/erreurs'
import { formaterHeureMatch, formaterJourMatch } from '../../lib/format'
import type { AlgorithmeClassement, EquipeResumeTournoi, MatchTournoi } from '../../types/api'
import { useEquipes } from './apiEquipes'
import { useMatchs } from './apiMatchs'
import { LigneEquipe, type InfoEquipe } from './LigneEquipe'
import { DialogueStatsMatch } from './DialogueStatsMatch'

interface Props {
  tournoiId: number
  equipes: EquipeResumeTournoi[]
  // Determine quels champs comptent pour le classement de CE tournoi —
  // transmis tel quel a DialogueStatsMatch (voir constantes.ts).
  algorithmeClassement: AlgorithmeClassement
  // ORGANISATEUR : saisie/correction autorisee (meme plafond que le
  // score du match), mais supprimerStat reste ADMIN seulement — voir
  // DialogueStatsMatch. Par defaut true.
  estAdmin?: boolean
}

// Statistiques detaillees (points/fautes/contres/temps de jeu par
// joueur) : uniquement sur les matchs TERMINE — voir saisirStat cote
// backend, le score du match doit exister avant. Alimente les totaux du
// classement joueurs (onglet Classement).
export function OngletStatistiques({ tournoiId, equipes, algorithmeClassement, estAdmin = true }: Props) {
  const { data: matchs, isLoading, isError, error } = useMatchs(tournoiId)
  const { data: equipesCompletes } = useEquipes(tournoiId)
  const [matchSelectionne, setMatchSelectionne] = useState<MatchTournoi | null>(null)

  if (isLoading) return <SqueletteLignes lignes={4} />
  if (isError) {
    return (
      <p role="alert" className="text-sm text-danger">
        {messageErreurApi(error)}
      </p>
    )
  }

  const nomEquipe = (id: number) => equipes.find((e) => e.id === id)?.nom ?? '—'
  const infoEquipe = (id: number): InfoEquipe => {
    const complete = equipesCompletes?.find((e) => e.id === id)
    return { nom: nomEquipe(id), couleur: complete?.couleur ?? 'var(--secondary)', logo: complete?.logo ?? null }
  }
  // Le plus recent d'abord.
  const matchsTermines = (matchs ?? [])
    .filter((m) => m.statut === 'TERMINE')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-text-mute">Touche un match terminé pour saisir les stats de chaque joueur.</p>

      {matchsTermines.length === 0 ? (
        <EtatVide
          titre="Aucun match terminé"
          description="Les statistiques deviennent saisissables une fois un score enregistré (onglet Matchs)."
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {matchsTermines.map((match) => (
            <button
              key={match.id}
              type="button"
              onClick={() => setMatchSelectionne(match)}
              aria-label={`Saisir les stats du match ${infoEquipe(match.equipe1Id).nom} contre ${infoEquipe(match.equipe2Id).nom}`}
              className="block w-full text-left"
            >
              <CarteStatut ton="primaire">
                <p className="font-mono text-2xs tracking-wide text-text-mute uppercase">
                  {match.type} · {formaterJourMatch(match.date)} · {formaterHeureMatch(match.date)}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <LigneEquipe info={infoEquipe(match.equipe1Id)} score={match.score1} />
                    <LigneEquipe info={infoEquipe(match.equipe2Id)} score={match.score2} />
                  </div>
                  <span aria-hidden="true" className="text-text-mute">
                    ›
                  </span>
                </div>
              </CarteStatut>
            </button>
          ))}
        </div>
      )}

      <DialogueStatsMatch
        match={matchSelectionne}
        onFermer={() => setMatchSelectionne(null)}
        algorithmeClassement={algorithmeClassement}
        estAdmin={estAdmin}
      />
    </div>
  )
}
