import { useState } from 'react'
import { CarteStatut } from '../../components/ui/CarteStatut'
import { EtatVide } from '../../components/ui/EtatVide'
import { SqueletteLignes } from '../../components/ui/Squelette'
import { messageErreurApi } from '../../lib/erreurs'
import { formaterHeureMatch, formaterJourMatch } from '../../lib/format'
import type { AlgorithmeClassement, EquipeResumeTournoi, MatchTournoi } from '../../types/api'
import { useMatchs } from './apiMatchs'
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
  const matchsTermines = (matchs ?? []).filter((m) => m.statut === 'TERMINE')

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-text-mute">
        Clique sur un match terminé pour saisir les points/fautes/contres/temps de jeu de chaque joueur — c'est ce qui
        remplit ensuite le classement des joueurs (onglet Classement).
      </p>

      {matchsTermines.length === 0 ? (
        <EtatVide
          titre="Aucun match terminé"
          description="Les statistiques deviennent saisissables une fois un score enregistré (onglet Matchs)."
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {matchsTermines.map((match) => (
            <button key={match.id} type="button" onClick={() => setMatchSelectionne(match)} className="w-full text-left">
              <CarteStatut ton="primaire">
                <p className="font-mono text-2xs tracking-wide text-text-mute uppercase">
                  {match.type} · {formaterJourMatch(match.date)} · {formaterHeureMatch(match.date)} · {match.lieu}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
                  <p className="font-medium">
                    {nomEquipe(match.equipe1Id)} <span className="text-text-mute">vs</span> {nomEquipe(match.equipe2Id)}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums font-medium">
                      {match.score1} – {match.score2}
                    </span>
                    {/* Sans ce libelle, rien n'indiquait que la carte etait
                        cliquable ni ce qu'un clic declenchait. */}
                    <span className="effet-remplissage effet-remplissage-primaire inline-flex items-center whitespace-nowrap rounded-md border border-primary-text/30 bg-primary-text/12 px-2.5 py-1 text-xs font-medium text-primary-text transition-[border-color] duration-150">
                      <span className="contenu-remplissage">Saisir les stats →</span>
                    </span>
                  </div>
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
