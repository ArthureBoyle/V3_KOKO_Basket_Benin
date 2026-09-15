import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { CartePage } from '../../components/CartePage'
import { EnTetePage } from '../../components/EnTetePage'
import { Badge } from '../../components/ui/Badge'
import { Ballon } from '../../components/ui/Ballon'
import { Carreau } from '../../components/ui/Carreau'
import { EtatVide } from '../../components/ui/EtatVide'
import { Tableau, type Colonne } from '../../components/ui/Tableau'
import { useSession } from '../auth/session'
import { useComptes } from '../comptes/api'
import { messageErreurApi } from '../../lib/erreurs'
import { comparerNombre } from '../../lib/tri'
import type { TournoiAdmin } from '../../types/api'
import { useTournois } from '../tournois/api'

const COLONNES_ACTION: Colonne<TournoiAdmin>[] = [
  {
    cle: 'nom',
    entete: 'Tournoi',
    largeur: '2fr',
    rendu: (t) => (
      <>
        <p className="font-medium">{t.nom}</p>
        <p className="text-xs text-text-mute">{t.lieu}</p>
      </>
    ),
  },
  {
    cle: 'organisateur',
    entete: 'Organisateur',
    largeur: '1.6fr',
    rendu: (t) => `${t.organisateur.prenom} ${t.organisateur.nom}`,
  },
  {
    cle: 'scoresASaisir',
    entete: 'Scores à saisir',
    largeur: '1fr',
    numerique: true,
    align: 'centre',
    rendu: (t) => (
      <Badge ton="alerte" pulse>
        {t.compteurs.scoresASaisir}
      </Badge>
    ),
    comparer: (a, b) => comparerNombre(a.compteurs.scoresASaisir, b.compteurs.scoresASaisir),
  },
]

// Vue d'ensemble, pensee pour repondre a une seule question en un coup
// d'oeil : "qu'est-ce qui a besoin de moi maintenant ?" — jamais une
// liste exhaustive (deja couverte par Comptes/Tournois), juste les
// compteurs et ce qui reclame une action.
export function AccueilAdmin() {
  const { data: session } = useSession()
  const navigate = useNavigate()
  const { data: tournois, isLoading: chargementTournois, isError: erreurTournois, error: erreurTournoisMsg } = useTournois()
  const { data: comptes, isLoading: chargementComptes } = useComptes()

  const tournoisActifs = useMemo(() => (tournois ?? []).filter((t) => t.statut === 'ACTIF'), [tournois])
  const tournoisAVenir = useMemo(() => (tournois ?? []).filter((t) => t.statut === 'A_VENIR'), [tournois])
  const scoresASaisir = useMemo(
    () => (tournois ?? []).reduce((total, t) => total + t.compteurs.scoresASaisir, 0),
    [tournois],
  )
  const tournoisAvecAction = useMemo(
    () => (tournois ?? []).filter((t) => t.compteurs.scoresASaisir > 0),
    [tournois],
  )
  const comptesActifs = useMemo(() => (comptes ?? []).filter((c) => c.actif).length, [comptes])

  const chargement = chargementTournois || chargementComptes

  return (
    <section className="flex flex-col gap-6">
      <EnTetePage
        titre="Supervision"
        description={`Bonjour ${session?.prenom}.`}
        icone={<Ballon mode="arret" className="size-6" />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Carreau libelle="Tournois en cours" centrer onClick={() => navigate('/admin/tournois')}>
          <span className="text-2xl tabular-nums">{chargement ? '—' : tournoisActifs.length}</span>
        </Carreau>
        <Carreau libelle="Tournois à venir" centrer onClick={() => navigate('/admin/tournois')}>
          <span className="text-2xl tabular-nums">{chargement ? '—' : tournoisAVenir.length}</span>
        </Carreau>
        <Carreau libelle="Scores à saisir" centrer onClick={() => navigate('/admin/tournois')}>
          <span className={`text-2xl tabular-nums ${scoresASaisir > 0 ? 'text-warning' : ''}`}>
            {chargement ? '—' : scoresASaisir}
          </span>
        </Carreau>
        <Carreau libelle="Comptes actifs" centrer onClick={() => navigate('/admin/comptes')}>
          <span className="text-2xl tabular-nums">{chargement ? '—' : comptesActifs}</span>
        </Carreau>
      </div>

      <CartePage>
        <h2 className="mb-4 text-xl font-medium">Nécessite une action</h2>
        {erreurTournois ? (
          <p role="alert" className="text-sm text-danger">
            {messageErreurApi(erreurTournoisMsg)}
          </p>
        ) : (
          <Tableau
            libelle="Tournois avec des scores à saisir"
            colonnes={COLONNES_ACTION}
            lignes={tournoisAvecAction}
            cleLigne={(t) => t.id}
            lienLigne={(t) => `/admin/tournois/${t.id}`}
            chargement={chargementTournois}
            vide={
              <EtatVide
                titre="Rien à traiter"
                description="Aucun match en attente de score pour le moment."
              />
            }
          />
        )}
      </CartePage>
    </section>
  )
}
