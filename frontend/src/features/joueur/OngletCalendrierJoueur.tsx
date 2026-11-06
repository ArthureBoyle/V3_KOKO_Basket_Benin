import { useState } from 'react'
import type { TonBadge } from '../../components/ui/Badge'
import { BadgeStatutMatch } from '../../components/ui/Badge'
import { Dialogue } from '../../components/ui/Dialogue'
import { CarteStatut } from '../../components/ui/CarteStatut'
import { LogoEquipe } from '../../components/ui/LogoEquipe'
import { EtatVide } from '../../components/ui/EtatVide'
import { SqueletteLignes } from '../../components/ui/Squelette'
import { messageErreurApi } from '../../lib/erreurs'
import { formaterHeureMatch, formaterJourLongMatch, formaterJourMatch } from '../../lib/format'
import type { EquipeMatchJoueur, MatchJoueur, StatutMatch } from '../../types/api'
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

const STATUTS_A_VENIR: StatutMatch[] = ['A_VENIR', 'EN_RETARD', 'REPORTE']

function Equipes({ match, monEquipeId, grand = false }: { match: MatchJoueur; monEquipeId: number | null; grand?: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <LigneEquipe equipe={match.equipe1} score={match.score1} moi={match.equipe1Id === monEquipeId} grand={grand} />
      <LigneEquipe equipe={match.equipe2} score={match.score2} moi={match.equipe2Id === monEquipeId} grand={grand} />
    </div>
  )
}

function Section({ titre, matchs, monEquipeId, onChoisir }: { titre: string; matchs: MatchJoueur[]; monEquipeId: number | null; onChoisir: (m: MatchJoueur) => void }) {
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
            aria-label={`Détails du match ${match.equipe1.nom} contre ${match.equipe2.nom}`}
            className="block w-full text-left"
          >
            <CarteStatut ton={tonMatch(match, monEquipeId)}>
              <p className="font-mono text-2xs tracking-wide text-text-mute uppercase">
                {match.type} · {formaterJourMatch(match.date)} · {formaterHeureMatch(match.date)}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <Equipes match={match} monEquipeId={monEquipeId} />
                {/* Le statut normal (à venir / terminé) est déjà dit par la
                    section ; le badge n'apparaît que pour un cas à signaler
                    (retard, report, annulation). Le détail est dans la fiche. */}
                {match.statut !== 'A_VENIR' && match.statut !== 'TERMINE' && <BadgeStatutMatch statut={match.statut} />}
                <span aria-hidden="true" className="text-text-mute">›</span>
              </div>
            </CarteStatut>
          </button>
        ))}
      </div>
    </section>
  )
}

function Info({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <dt className="text-sm text-text-mute">{libelle}</dt>
      <dd className="text-right text-sm font-medium break-words">{valeur}</dd>
    </div>
  )
}

function FicheMatch({ match, monEquipeId }: { match: MatchJoueur; monEquipeId: number | null }) {
  return (
    <div>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-elevated p-4">
        <Equipes match={match} monEquipeId={monEquipeId} grand />
        <BadgeStatutMatch statut={match.statut} />
      </div>
      <dl className="mt-3">
        <Info libelle="Date" valeur={formaterJourLongMatch(match.date)} />
        <Info libelle="Heure" valeur={formaterHeureMatch(match.date)} />
        <Info libelle="Lieu" valeur={match.lieu} />
        <Info libelle="Phase" valeur={match.type} />
        {match.arbitre && <Info libelle="Arbitre" valeur={match.arbitre} />}
        {match.dateOriginale && (
          <Info libelle="Initialement prévu" valeur={`${formaterJourMatch(match.dateOriginale)} · ${formaterHeureMatch(match.dateOriginale)}`} />
        )}
      </dl>
    </div>
  )
}

function LigneEquipe({ equipe, score, moi, grand }: { equipe: EquipeMatchJoueur; score: number | null; moi: boolean; grand: boolean }) {
  return (
    <p className="flex items-center gap-3">
      <LogoEquipe couleur={equipe.couleur} logo={equipe.logo} className={grand ? 'size-8' : 'size-6'} />
      <span
        title={equipe.nom}
        className={`min-w-0 flex-1 font-medium break-words ${grand ? 'text-lg' : 'line-clamp-2'} ${moi ? 'text-primary-text' : ''}`}
      >
        {equipe.nom}
      </span>
      {score !== null && <span className={`shrink-0 font-semibold tabular-nums ${grand ? 'text-lg' : ''}`}>{score}</span>}
    </p>
  )
}

export function OngletCalendrierJoueur({ tournoiId, monEquipeId }: { tournoiId: number; monEquipeId: number | null }) {
  const { data: matchs, isLoading, isError, error } = useMesMatchsJoueur(tournoiId)
  const [choisi, setChoisi] = useState<MatchJoueur | null>(null)

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

  // Deux sections plutot qu'un filtre : l'etat se lit d'un coup d'oeil.
  // A venir : le plus proche d'abord. Termines : le plus recent d'abord.
  const parDate = (a: MatchJoueur, b: MatchJoueur) => new Date(a.date).getTime() - new Date(b.date).getTime()
  const aVenir = matchs.filter((m) => STATUTS_A_VENIR.includes(m.statut)).sort(parDate)
  const termines = matchs.filter((m) => !STATUTS_A_VENIR.includes(m.statut)).sort((a, b) => parDate(b, a))

  return (
    <div className="flex flex-col gap-7">
      <Section titre="À venir" matchs={aVenir} monEquipeId={monEquipeId} onChoisir={setChoisi} />
      <Section titre="Terminés" matchs={termines} monEquipeId={monEquipeId} onChoisir={setChoisi} />

      <Dialogue ouvert={choisi !== null} onFermer={() => setChoisi(null)} titre="Détails du match">
        {choisi && <FicheMatch match={choisi} monEquipeId={monEquipeId} />}
      </Dialogue>
    </div>
  )
}
