import { useState } from 'react'
import { useNotifier } from '../../components/notifications/contexte'
import { Badge, type TonBadge } from '../../components/ui/Badge'
import { LogoEquipe } from '../../components/ui/LogoEquipe'
import { Bouton } from '../../components/ui/Bouton'
import { CarteStatut } from '../../components/ui/CarteStatut'
import { DialogueConfirmation } from '../../components/ui/DialogueConfirmation'
import { EtatVide } from '../../components/ui/EtatVide'
import { SqueletteLignes } from '../../components/ui/Squelette'
import { messageErreurApi } from '../../lib/erreurs'
import { formaterHeureMatch, formaterJourMatch } from '../../lib/format'
import type { EquipeResumeTournoi, MatchTournoi, StatutMatch } from '../../types/api'
import { useEquipes } from './apiEquipes'
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

interface InfoEquipe {
  nom: string
  couleur: string
  logo: string | null
}

const STATUTS_A_VENIR: StatutMatch[] = ['A_VENIR', 'REPORTE']

function LigneEquipe({ info, score }: { info: InfoEquipe; score: number | null }) {
  return (
    <p className="flex items-center gap-3">
      <LogoEquipe couleur={info.couleur} logo={info.logo} className="size-6" />
      <span title={info.nom} className="line-clamp-2 min-w-0 flex-1 font-medium break-words">
        {info.nom}
      </span>
      {score !== null && <span className="shrink-0 font-semibold tabular-nums">{score}</span>}
    </p>
  )
}

// Une carte = un bouton : toucher le match ouvre le panneau "Gerer"
// (score, report, annulation...). Le statut normal est dit par la section ;
// le badge ne reste que pour un cas a signaler.
function SectionMatchs({
  titre,
  matchs,
  infoEquipe,
  onChoisir,
}: {
  titre: string
  matchs: MatchTournoi[]
  infoEquipe: (id: number) => InfoEquipe
  onChoisir: (m: MatchTournoi) => void
}) {
  if (matchs.length === 0) return null
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-medium tracking-[0.08em] text-text-mute uppercase">
        {titre}
        <span className="rounded-md bg-elevated px-2 py-0.5 text-2xs tabular-nums">{matchs.length}</span>
      </h3>
      <div className="flex flex-col gap-2.5">
        {matchs.map((match) => (
          <button
            key={match.id}
            type="button"
            onClick={() => onChoisir(match)}
            aria-label={`Gérer le match ${infoEquipe(match.equipe1Id).nom} contre ${infoEquipe(match.equipe2Id).nom}`}
            className="block w-full text-left"
          >
            <CarteStatut ton={TONS_STATUT[match.statut]}>
              <p className="font-mono text-2xs tracking-wide text-text-mute uppercase">
                {match.type} · {formaterJourMatch(match.date)} · {formaterHeureMatch(match.date)}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <LigneEquipe info={infoEquipe(match.equipe1Id)} score={match.score1} />
                  <LigneEquipe info={infoEquipe(match.equipe2Id)} score={match.score2} />
                </div>
                {(match.statut === 'REPORTE' || match.statut === 'ANNULE') && (
                  <Badge ton={match.statut === 'ANNULE' ? 'danger' : 'alerte'}>{LIBELLE_STATUT[match.statut]}</Badge>
                )}
                <span aria-hidden="true" className="text-text-mute">
                  ›
                </span>
              </div>
            </CarteStatut>
          </button>
        ))}
      </div>
    </section>
  )
}

export function OngletMatchs({ tournoiId, equipes, estAdmin = true }: Props) {
  const { data: matchs, isLoading, isError, error } = useMatchs(tournoiId)
  const { data: equipesCompletes } = useEquipes(tournoiId)
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
  const infoEquipe = (id: number): InfoEquipe => {
    const complete = equipesCompletes?.find((e) => e.id === id)
    return { nom: nomEquipe(id), couleur: complete?.couleur ?? 'var(--secondary)', logo: complete?.logo ?? null }
  }
  const parDate = (a: MatchTournoi, b: MatchTournoi) => new Date(a.date).getTime() - new Date(b.date).getTime()
  const sections = {
    aSaisir: (matchs ?? []).filter((m) => m.statut === 'EN_RETARD').sort(parDate),
    aVenir: (matchs ?? []).filter((m) => STATUTS_A_VENIR.includes(m.statut)).sort(parDate),
    termines: (matchs ?? []).filter((m) => m.statut === 'TERMINE' || m.statut === 'ANNULE').sort((a, b) => parDate(b, a)),
  }
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
        <div className="flex flex-col gap-7">
          <SectionMatchs titre="Score à saisir" matchs={sections.aSaisir} infoEquipe={infoEquipe} onChoisir={setMatchGere} />
          <SectionMatchs titre="À venir" matchs={sections.aVenir} infoEquipe={infoEquipe} onChoisir={setMatchGere} />
          <SectionMatchs titre="Terminés" matchs={sections.termines} infoEquipe={infoEquipe} onChoisir={setMatchGere} />
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
