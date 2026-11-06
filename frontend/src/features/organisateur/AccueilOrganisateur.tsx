import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { CartePage } from '../../components/CartePage'
import { EnTetePage } from '../../components/EnTetePage'
import { Badge } from '../../components/ui/Badge'
import { Carreau } from '../../components/ui/Carreau'
import { EtatVide } from '../../components/ui/EtatVide'
import { Tableau, type Colonne } from '../../components/ui/Tableau'
import { useSession } from '../auth/session'
import { messageErreurApi } from '../../lib/erreurs'
import { comparerNombre } from '../../lib/tri'
import type { TournoiOrganisateur } from '../../types/api'
import { useMesTournois } from '../tournois/api'
import { CartesTournois } from '../tournois/CartesTournois'

const COLONNES_ACTION: Colonne<TournoiOrganisateur>[] = [
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

// Meme logique que le dashboard admin (AccueilAdmin) : repondre a "qu'est
// ce qui a besoin de moi maintenant ?", jamais une liste exhaustive
// (deja couverte par Mes tournois) — juste les compteurs et l'action a
// mener, scopes aux tournois de CET organisateur.
export function AccueilOrganisateur() {
  const { data: session } = useSession()
  const navigate = useNavigate()
  const { data: tournois, isLoading, isError, error } = useMesTournois()

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

  return (
    <section className="flex flex-col gap-6">
      <EnTetePage
        titre="Supervision"
        description={`Bonjour ${session?.prenom}.`}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Carreau libelle="Tournois en cours" centrer onClick={() => navigate('/organisateur/tournois')}>
          <span className="text-2xl tabular-nums">{isLoading ? '—' : tournoisActifs.length}</span>
        </Carreau>
        <Carreau libelle="Tournois à venir" centrer onClick={() => navigate('/organisateur/tournois')}>
          <span className="text-2xl tabular-nums">{isLoading ? '—' : tournoisAVenir.length}</span>
        </Carreau>
        <div className="col-span-2 md:col-span-1">
        <Carreau libelle="Scores à saisir" centrer onClick={() => navigate('/organisateur/tournois')}>
          <span className={`text-2xl tabular-nums ${scoresASaisir > 0 ? 'text-warning' : ''}`}>
            {isLoading ? '—' : scoresASaisir}
          </span>
        </Carreau>
        </div>
      </div>

      <CartePage sansFondMobile>
        <h2 className="mb-4 text-xl font-medium">Nécessite une action</h2>
        {isError ? (
          <p role="alert" className="text-sm text-danger">
            {messageErreurApi(error)}
          </p>
        ) : (
          <>
            {tournoisAvecAction.length > 0 && <CartesTournois tournois={tournoisAvecAction} lienBase="/organisateur/tournois" />}
            <div className={tournoisAvecAction.length > 0 ? 'max-md:hidden' : ''}>
          <Tableau
            libelle="Tournois avec des scores à saisir"
            colonnes={COLONNES_ACTION}
            lignes={tournoisAvecAction}
            cleLigne={(t) => t.id}
            lienLigne={(t) => `/organisateur/tournois/${t.id}`}
            chargement={isLoading}
            vide={<EtatVide titre="Rien à traiter" description="Aucun match en attente de score pour le moment." />}
          />
            </div>
          </>
        )}
      </CartePage>
    </section>
  )
}
