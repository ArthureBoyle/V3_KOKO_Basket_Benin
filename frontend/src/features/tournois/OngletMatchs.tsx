import { useState } from 'react'
import { useNotifier } from '../../components/notifications/contexte'
import type { TonBadge } from '../../components/ui/Badge'
import { Bouton } from '../../components/ui/Bouton'
import { CarteStatut } from '../../components/ui/CarteStatut'
import { DialogueConfirmation } from '../../components/ui/DialogueConfirmation'
import { EtatVide } from '../../components/ui/EtatVide'
import { SqueletteLignes } from '../../components/ui/Squelette'
import { messageErreurApi } from '../../lib/erreurs'
import { formaterHeureMatch, formaterJourMatch } from '../../lib/format'
import type { EquipeResumeTournoi, MatchTournoi, StatutMatch } from '../../types/api'
import { useAnnulerMatch, useMatchs, useReactiverMatch, useReporterMatch } from './apiMatchs'
import { DialogueCreerMatch } from './DialogueCreerMatch'
import { DialogueGererMatch } from './DialogueGererMatch'
import { DialogueReprogrammerMatch } from './DialogueReprogrammerMatch'
import { DialogueSaisirScore } from './DialogueSaisirScore'

interface Props {
  tournoiId: number
  equipes: EquipeResumeTournoi[]
  // ORGANISATEUR : plafond de 2 corrections de score (voir
  // DialogueSaisirScore) — affiche pour lui seul, l'ADMIN est illimite.
  estAdmin?: boolean
}

// Meme mapping que Badge.tsx (STATUTS_MATCH, non exporte) : liseret de
// carte aligne sur la couleur du badge de statut.
const TONS_STATUT: Record<StatutMatch, TonBadge> = {
  A_VENIR: 'neutre',
  EN_RETARD: 'alerte',
  REPORTE: 'alerte',
  TERMINE: 'primaire',
  ANNULE: 'danger',
}

// Meme libelles que Badge.tsx (STATUTS_MATCH, non exporte) : repris ici en
// texte brut, plies dans la ligne de metadonnees (plus de pilule separee).
const LIBELLE_STATUT: Record<StatutMatch, string> = {
  A_VENIR: 'À venir',
  EN_RETARD: 'Score attendu',
  REPORTE: 'Reporté',
  TERMINE: 'Terminé',
  ANNULE: 'Annulé',
}

// Petit bouton pilule avec remplissage au survol (effet par defaut du
// projet, voir styles/index.css) : jamais un simple lien souligne pour
// une action, meme secondaire.
function BoutonAction({
  ton,
  onClick,
  disabled,
  children,
}: {
  ton: 'primaire' | 'danger'
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  const classesTon =
    ton === 'primaire'
      ? 'border-primary-text/30 bg-primary-text/12 text-primary-text'
      : 'border-danger/30 bg-danger/12 text-danger'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`effet-remplissage effet-remplissage-${ton} whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-medium transition-[border-color] duration-150 disabled:opacity-60 ${classesTon}`}
    >
      <span className="contenu-remplissage">{children}</span>
    </button>
  )
}

export function OngletMatchs({ tournoiId, equipes, estAdmin = true }: Props) {
  const { data: matchs, isLoading, isError, error } = useMatchs(tournoiId)
  const [creationOuverte, setCreationOuverte] = useState(false)
  const [matchScore, setMatchScore] = useState<MatchTournoi | null>(null)
  const [matchReprog, setMatchReprog] = useState<MatchTournoi | null>(null)
  const [matchAReporter, setMatchAReporter] = useState<MatchTournoi | null>(null)
  const [matchAAnnuler, setMatchAAnnuler] = useState<MatchTournoi | null>(null)
  const [matchGere, setMatchGere] = useState<MatchTournoi | null>(null)
  const annuler = useAnnulerMatch(tournoiId)
  const reactiver = useReactiverMatch(tournoiId)
  const reporter = useReporterMatch(tournoiId)
  const notifier = useNotifier()

  if (isLoading) return <SqueletteLignes lignes={4} />
  if (isError) {
    return (
      <p role="alert" className="text-sm text-danger">
        {messageErreurApi(error)}
      </p>
    )
  }

  const nomEquipe = (id: number) => equipes.find((e) => e.id === id)?.nom ?? '—'
  const pasAssezEquipes = equipes.length < 2
  const nombre = matchs?.length ?? 0

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-text-mute">
          <span className="font-medium text-text tabular-nums">{nombre}</span> match{nombre > 1 ? 's' : ''} programmé
          {nombre > 1 ? 's' : ''}
        </p>
        <Bouton magnetique onClick={() => setCreationOuverte(true)} disabled={pasAssezEquipes}>
          Créer un match
        </Bouton>
      </div>
      {pasAssezEquipes && (
        <p className="text-xs text-warning">Crée au moins 2 équipes (onglet Équipes) avant de programmer un match.</p>
      )}

      {nombre === 0 ? (
        <EtatVide titre="Aucun match" description="Programme le premier match de ce tournoi." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {matchs!.map((match) => (
            <CarteStatut key={match.id} ton={TONS_STATUT[match.statut]}>
              {/* Une seule ligne de metadonnees (statut/poule/date/heure/
                  lieu), mono, au-dessus des equipes — plus de pilule de
                  statut ni de 2e ligne repetant la date en bas. */}
              <p className="font-mono text-2xs tracking-wide text-text-mute uppercase">
                {LIBELLE_STATUT[match.statut]} · {match.type} · {formaterJourMatch(match.date)} ·{' '}
                {formaterHeureMatch(match.date)} · {match.lieu}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
                <p className="font-medium">
                  {nomEquipe(match.equipe1Id)} <span className="text-text-mute">vs</span> {nomEquipe(match.equipe2Id)}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {match.score1 !== null && match.score2 !== null && (
                    <span className="tabular-nums font-medium">
                      {match.score1} – {match.score2}
                    </span>
                  )}

                  {/* Toujours LE MEME bouton, sur toutes les cartes quel que
                      soit le statut : jamais une rangee de boutons dont le
                      nombre change d'une carte a l'autre (incoherence
                      visuelle) — le detail des actions possibles/impossibles
                      est dans le panneau qu'il ouvre (DialogueGererMatch). */}
                  <BoutonAction ton="primaire" onClick={() => setMatchGere(match)}>
                    ✏️ Gérer
                  </BoutonAction>
                </div>
              </div>
            </CarteStatut>
          ))}
        </div>
      )}

      <DialogueCreerMatch tournoiId={tournoiId} equipes={equipes} ouvert={creationOuverte} onFermer={() => setCreationOuverte(false)} />

      <DialogueGererMatch
        match={matchGere}
        estAdmin={estAdmin}
        onFermer={() => setMatchGere(null)}
        onSaisirScore={() => {
          setMatchScore(matchGere)
          setMatchGere(null)
        }}
        onReporter={() => {
          setMatchAReporter(matchGere)
          setMatchGere(null)
        }}
        onReprogrammer={() => {
          setMatchReprog(matchGere)
          setMatchGere(null)
        }}
        onAnnuler={() => {
          setMatchAAnnuler(matchGere)
          setMatchGere(null)
        }}
        onReactiver={() => {
          if (!matchGere) return
          reactiver.mutate(matchGere.id, { onSuccess: () => notifier('Match réactivé', 'succes') })
          setMatchGere(null)
        }}
      />

      <DialogueSaisirScore
        match={matchScore}
        tournoiId={tournoiId}
        nomEquipe1={matchScore ? nomEquipe(matchScore.equipe1Id) : ''}
        nomEquipe2={matchScore ? nomEquipe(matchScore.equipe2Id) : ''}
        onFermer={() => setMatchScore(null)}
        estAdmin={estAdmin}
      />
      <DialogueReprogrammerMatch match={matchReprog} tournoiId={tournoiId} onFermer={() => setMatchReprog(null)} />

      <DialogueConfirmation
        ouvert={matchAReporter !== null}
        onFermer={() => setMatchAReporter(null)}
        titre="Reporter ce match ?"
        description="La date d'origine reste enregistrée, tu pourras le reprogrammer ensuite."
        libelleConfirmation="Reporter"
        onConfirmer={async () => {
          if (!matchAReporter) return
          await reporter.mutateAsync(matchAReporter.id)
          notifier('Match reporté', 'succes')
        }}
      />
      <DialogueConfirmation
        ouvert={matchAAnnuler !== null}
        onFermer={() => setMatchAAnnuler(null)}
        titre="Annuler ce match ?"
        description="Le match passe en annulé ; tu pourras le réactiver plus tard si besoin."
        libelleConfirmation="Annuler le match"
        dangereux
        onConfirmer={async () => {
          if (!matchAAnnuler) return
          await annuler.mutateAsync(matchAAnnuler.id)
          notifier('Match annulé', 'succes')
        }}
      />
    </div>
  )
}
