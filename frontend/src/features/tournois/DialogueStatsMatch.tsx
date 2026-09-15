import { useState } from 'react'
import { useNotifier } from '../../components/notifications/contexte'
import { Dialogue } from '../../components/ui/Dialogue'
import { EtatVide } from '../../components/ui/EtatVide'
import { SqueletteLignes } from '../../components/ui/Squelette'
import { messageErreurApi } from '../../lib/erreurs'
import { formaterNomJoueur } from '../../lib/format'
import type { AlgorithmeClassement, MatchTournoi, StatJoueurMatch } from '../../types/api'
import { useEquipe } from './apiEquipes'
import { useSaisirStat, useStatsMatch, useSupprimerStat } from './apiStats'
import { champsComptantPourLeClassement, LIBELLES_ALGORITHME } from './constantes'

interface Props {
  match: MatchTournoi | null
  onFermer: () => void
  // Determine QUELS champs comptent reellement pour ce tournoi (voir
  // constantes.ts) : la saisie s'adapte, jamais fige sur 4 champs qu'on
  // suppose tous utiles.
  algorithmeClassement: AlgorithmeClassement
  // ORGANISATEUR : GET /matchs/:id/stats masque deja les stats
  // orphelines cote backend pour lui (getStats), donc statsOrphelines
  // serait de toute facon toujours vide ; ce drapeau evite en plus de
  // rendre la section (et son bouton Supprimer, ADMIN seulement) pour
  // plus de clarte. Par defaut true.
  estAdmin?: boolean
}

// Un champ + son libelle au-dessus : "✓" signale qu'IL COMPTE pour le
// classement de ce tournoi (voir aussi le mode vision sur le carreau
// Algorithme de la fiche tournoi), "—" qu'il n'y entre pas — jamais
// d'ambiguite sur les champs non evalues, mais toujours saisissables
// (l'historique du joueur les garde).
function ChampStat({
  libelle,
  compte,
  valeur,
  onChange,
  disabled,
}: {
  libelle: string
  compte: boolean
  valeur: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <label className="flex flex-col items-center gap-1">
      <span className={`text-2xs tracking-wide uppercase ${compte ? 'text-primary-text' : 'text-text-mute'}`}>
        {libelle}
        <span aria-hidden="true" className="ml-1">
          {compte ? '✓' : '—'}
        </span>
      </span>
      <input
        aria-label={libelle}
        type="number"
        min={0}
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-16 rounded-md border border-border bg-surface px-2 py-1.5 text-center text-sm tabular-nums text-text disabled:opacity-60"
      />
    </label>
  )
}

const TENTATIVES_MAX = 3

// Une carte = un joueur du roster, entierement autonome (nom/numero en
// en-tete, jamais ambigu sur qui on edite) + un bouton d'enregistrement
// individuel (upsert independant cote backend, une carte peut etre
// sauvee sans les autres). Meme plafond que le score du match (voir
// DialogueSaisirScore) : 1 saisie + 2 corrections pour l'organisateur —
// au-dela, le backend refusait deja (403) mais SANS RIEN AFFICHER,
// laissant croire a une sauvegarde reussie qui ne l'etait pas.
function CarteJoueurStat({
  matchId,
  joueurId,
  equipeId,
  numero,
  nom,
  statExistante,
  champsComptes,
  estAdmin,
}: {
  matchId: number
  joueurId: number
  equipeId: number
  numero: number
  nom: string
  statExistante: StatJoueurMatch | undefined
  champsComptes: { points: boolean; fautes: boolean; contres: boolean }
  estAdmin: boolean
}) {
  const [points, setPoints] = useState(String(statExistante?.points ?? 0))
  const [fautes, setFautes] = useState(String(statExistante?.fautes ?? 0))
  const [contres, setContres] = useState(String(statExistante?.contres ?? 0))
  const [tempsJeu, setTempsJeu] = useState(String(statExistante?.tempsJeu ?? 0))
  const [erreur, setErreur] = useState<string | null>(null)
  const saisir = useSaisirStat(matchId)
  const notifier = useNotifier()

  const tentativesUtilisees = statExistante ? 1 + statExistante.nombreCorrections : 0
  const prochaineTentative = tentativesUtilisees + 1
  const limiteAtteinte = !estAdmin && prochaineTentative > TENTATIVES_MAX

  const enregistrer = () => {
    setErreur(null)
    saisir.mutate(
      {
        joueurId,
        donnees: { equipeId, points: Number(points), fautes: Number(fautes), contres: Number(contres), tempsJeu: Number(tempsJeu) },
      },
      {
        onSuccess: () => notifier('Stat enregistrée', 'succes'),
        onError: (err) => setErreur(messageErreurApi(err)),
      },
    )
  }

  return (
    <div className="rounded-lg border border-border bg-elevated p-3">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-xs font-medium tabular-nums">
          {numero}
        </span>
        <p className="font-medium">{nom}</p>
      </div>
      {!estAdmin && (
        <p className={`mb-2 text-2xs ${limiteAtteinte ? 'text-danger' : 'text-text-mute'}`}>
          {limiteAtteinte
            ? `Limite de ${TENTATIVES_MAX} tentatives atteinte : seul un administrateur peut corriger cette stat.`
            : `Tentative ${prochaineTentative}/${TENTATIVES_MAX} (1 saisie + 2 corrections maximum).`}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <ChampStat libelle="Points" compte={champsComptes.points} valeur={points} onChange={setPoints} disabled={limiteAtteinte} />
        <ChampStat libelle="Fautes" compte={champsComptes.fautes} valeur={fautes} onChange={setFautes} disabled={limiteAtteinte} />
        <ChampStat libelle="Contres" compte={champsComptes.contres} valeur={contres} onChange={setContres} disabled={limiteAtteinte} />
        <ChampStat libelle="Min" compte={false} valeur={tempsJeu} onChange={setTempsJeu} disabled={limiteAtteinte} />
        <button
          type="button"
          onClick={enregistrer}
          disabled={saisir.isPending || limiteAtteinte}
          className="effet-remplissage effet-remplissage-primaire whitespace-nowrap rounded-md border border-primary-text/30 bg-primary-text/12 px-3 py-1.5 text-xs font-medium text-primary-text transition-[border-color] duration-150 disabled:opacity-60"
        >
          <span className="contenu-remplissage">{saisir.isPending ? '…' : statExistante ? 'Corriger' : 'Enregistrer'}</span>
        </button>
      </div>
      {erreur && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {erreur}
        </p>
      )}
    </div>
  )
}

function GrilleEquipe({
  matchId,
  nomEquipe,
  joueurs,
  stats,
  champsComptes,
  estAdmin,
}: {
  matchId: number
  nomEquipe: string
  joueurs: { equipeId: number; joueurId: number; numeroDeMaillot: number; nom: string }[]
  stats: Map<number, StatJoueurMatch>
  champsComptes: { points: boolean; fautes: boolean; contres: boolean }
  estAdmin: boolean
}) {
  if (joueurs.length === 0) {
    return (
      <div>
        <h3 className="mb-2 font-medium">{nomEquipe}</h3>
        <p className="text-sm text-text-mute">Effectif vide (onglet Équipes).</p>
      </div>
    )
  }
  return (
    <div>
      <h3 className="mb-2 font-medium">{nomEquipe}</h3>
      <div className="flex flex-col gap-2">
        {joueurs.map((j) => (
          <CarteJoueurStat
            key={j.joueurId}
            matchId={matchId}
            joueurId={j.joueurId}
            equipeId={j.equipeId}
            numero={j.numeroDeMaillot}
            nom={j.nom}
            statExistante={stats.get(j.joueurId)}
            champsComptes={champsComptes}
            estAdmin={estAdmin}
          />
        ))}
      </div>
    </div>
  )
}

export function DialogueStatsMatch({ match, onFermer, algorithmeClassement, estAdmin = true }: Props) {
  const equipe1 = useEquipe(match?.equipe1Id ?? null)
  const equipe2 = useEquipe(match?.equipe2Id ?? null)
  const stats = useStatsMatch(match?.id ?? null)
  const supprimer = useSupprimerStat(match?.id ?? 0)
  const notifier = useNotifier()

  const chargement = equipe1.isLoading || equipe2.isLoading || stats.isLoading
  const enErreur = equipe1.isError || equipe2.isError || stats.isError
  const champsComptes = champsComptantPourLeClassement(algorithmeClassement)

  const statsParJoueur = new Map((stats.data ?? []).map((s) => [s.joueurId, s]))
  const idsRoster = new Set([
    ...(equipe1.data?.joueurs.map((j) => j.joueurId) ?? []),
    ...(equipe2.data?.joueurs.map((j) => j.joueurId) ?? []),
  ])
  const statsOrphelines = (stats.data ?? []).filter((s) => !idsRoster.has(s.joueurId))

  return (
    <Dialogue
      ouvert={match !== null}
      onFermer={onFermer}
      titre="Statistiques du match"
      description={
        <>
          Chaque joueur s'enregistre indépendamment.{' '}
          <span className="text-primary-text">✓</span> = compte pour le classement de ce tournoi (algorithme :{' '}
          {LIBELLES_ALGORITHME[algorithmeClassement]}).
        </>
      }
    >
      {chargement ? (
        <SqueletteLignes lignes={4} />
      ) : enErreur ? (
        <p role="alert" className="text-sm text-danger">
          {messageErreurApi(equipe1.error ?? equipe2.error ?? stats.error)}
        </p>
      ) : (
        match && (
          <div className="flex flex-col gap-6">
            <GrilleEquipe
              matchId={match.id}
              nomEquipe={equipe1.data!.nom}
              joueurs={equipe1.data!.joueurs.map((j) => ({
                equipeId: match.equipe1Id,
                joueurId: j.joueurId,
                numeroDeMaillot: j.numeroDeMaillot,
                nom: formaterNomJoueur({ nom: j.joueur.nomLegal, prenom: j.joueur.prenom, surnom: null }),
              }))}
              stats={statsParJoueur}
              champsComptes={champsComptes}
              estAdmin={estAdmin}
            />
            <GrilleEquipe
              matchId={match.id}
              nomEquipe={equipe2.data!.nom}
              joueurs={equipe2.data!.joueurs.map((j) => ({
                equipeId: match.equipe2Id,
                joueurId: j.joueurId,
                numeroDeMaillot: j.numeroDeMaillot,
                nom: formaterNomJoueur({ nom: j.joueur.nomLegal, prenom: j.joueur.prenom, surnom: null }),
              }))}
              stats={statsParJoueur}
              champsComptes={champsComptes}
              estAdmin={estAdmin}
            />

            {estAdmin && statsOrphelines.length > 0 && (
              <div>
                <h3 className="mb-2 font-medium text-text-mute">Joueurs retirés du tournoi depuis</h3>
                <div className="flex flex-col gap-2">
                  {statsOrphelines.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-text-mute"
                    >
                      <span>
                        {formaterNomJoueur({ nom: s.joueur.nomLegal, prenom: s.joueur.prenom, surnom: null })} —{' '}
                        {s.points} pts · {s.fautes} fautes · {s.contres} contres · {s.tempsJeu} min
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          supprimer.mutate(s.joueurId, { onSuccess: () => notifier('Stat supprimée', 'succes') })
                        }
                        disabled={supprimer.isPending}
                        className="effet-remplissage effet-remplissage-danger whitespace-nowrap rounded-md border border-danger/30 bg-danger/12 px-2.5 py-1 text-xs font-medium text-danger transition-[border-color] duration-150 disabled:opacity-60"
                      >
                        <span className="contenu-remplissage">Supprimer</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {equipe1.data!.joueurs.length === 0 && equipe2.data!.joueurs.length === 0 && statsOrphelines.length === 0 && (
              <EtatVide titre="Aucun joueur" description="Les deux équipes doivent avoir un effectif pour saisir des stats." />
            )}
          </div>
        )
      )}
    </Dialogue>
  )
}
