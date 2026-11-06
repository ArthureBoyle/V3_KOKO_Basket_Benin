import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { CartePage } from '../../components/CartePage'
import { EnTetePage } from '../../components/EnTetePage'
import { BadgeStatutTournoi } from '../../components/ui/Badge'
import { Carreau } from '../../components/ui/Carreau'
import { EtatVide } from '../../components/ui/EtatVide'
import { Tableau, type Colonne } from '../../components/ui/Tableau'
import { useSession } from '../auth/session'
import { messageErreurApi } from '../../lib/erreurs'
import { formaterJour } from '../../lib/format'
import { comparerTexte } from '../../lib/tri'
import type { InscriptionJoueur } from '../../types/api'
import { useMesTournoisJoueur } from './api'
import { CartesTournoisJoueur } from './CartesTournoisJoueur'

const COLONNES: Colonne<InscriptionJoueur>[] = [
  {
    cle: 'nom',
    entete: 'Tournoi',
    largeur: '2fr',
    rendu: (l) => (
      <>
        <p className="font-medium">{l.tournoi.nom}</p>
        <p className="text-xs text-text-mute">{l.tournoi.lieu}</p>
      </>
    ),
    comparer: (a, b) => comparerTexte(a.tournoi.nom, b.tournoi.nom),
  },
  {
    cle: 'dates',
    entete: 'Dates',
    largeur: '1.8fr',
    rendu: (l) => `${formaterJour(l.tournoi.dateDebut)} – ${formaterJour(l.tournoi.dateFin)}`,
  },
  {
    cle: 'statut',
    entete: 'Statut',
    largeur: '1fr',
    rendu: (l) => <BadgeStatutTournoi statut={l.tournoi.statut} />,
  },
]

// Meme logique que les dashboards Admin/Organisateur : les compteurs
// d'abord, la liste complete (avec recherche/filtre) est sur "Mes
// tournois" — ici juste "ou j'en suis maintenant".
export function AccueilJoueur() {
  const { data: session } = useSession()
  const navigate = useNavigate()
  const { data: inscriptions, isLoading, isError, error } = useMesTournoisJoueur()

  const enCours = useMemo(() => (inscriptions ?? []).filter((l) => l.tournoi.statut === 'ACTIF'), [inscriptions])
  const aVenir = useMemo(() => (inscriptions ?? []).filter((l) => l.tournoi.statut === 'A_VENIR'), [inscriptions])
  const tournoisActifsOuAVenir = useMemo(
    () => (inscriptions ?? []).filter((l) => l.tournoi.statut === 'ACTIF' || l.tournoi.statut === 'A_VENIR'),
    [inscriptions],
  )

  return (
    <section className="flex flex-col gap-6">
      <EnTetePage
        titre="Mes tournois"
        description={`Bonjour ${session?.prenom}.`}
      />

      <div className="grid grid-cols-2 gap-3">
        <Carreau libelle="Tournois en cours" centrer onClick={() => navigate('/joueur/tournois')}>
          <span className="text-2xl tabular-nums">{isLoading ? '—' : enCours.length}</span>
        </Carreau>
        <Carreau libelle="Tournois à venir" centrer onClick={() => navigate('/joueur/tournois')}>
          <span className="text-2xl tabular-nums">{isLoading ? '—' : aVenir.length}</span>
        </Carreau>
      </div>

      <CartePage sansFondMobile>
        <h2 className="mb-4 text-xl font-medium">En ce moment</h2>
        {isError ? (
          <p role="alert" className="text-sm text-danger">
            {messageErreurApi(error)}
          </p>
        ) : (
          <>
            {tournoisActifsOuAVenir.length > 0 && <CartesTournoisJoueur lignes={tournoisActifsOuAVenir} />}
            <div className={tournoisActifsOuAVenir.length > 0 ? 'max-md:hidden' : ''}>
              <Tableau
                libelle="Tournois en cours ou à venir"
                colonnes={COLONNES}
                lignes={tournoisActifsOuAVenir}
                cleLigne={(l) => l.tournoi.id}
                lienLigne={(l) => `/joueur/tournois/${l.tournoi.id}`}
                chargement={isLoading}
                vide={
                  <EtatVide
                    titre="Rien pour le moment"
                    description="Aucun tournoi en cours ou à venir où tu es certifié."
                  />
                }
              />
            </div>
          </>
        )}
      </CartePage>
    </section>
  )
}
