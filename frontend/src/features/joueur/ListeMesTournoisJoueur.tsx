import { useMemo, useState } from 'react'
import { CartePage } from '../../components/CartePage'
import { EnTetePage } from '../../components/EnTetePage'
import { BadgeStatutTournoi } from '../../components/ui/Badge'
import { Champ } from '../../components/ui/Champ'
import { EtatVide } from '../../components/ui/EtatVide'
import { Onglets, PanneauOnglet } from '../../components/ui/Onglets'
import { Tableau, type Colonne } from '../../components/ui/Tableau'
import { messageErreurApi } from '../../lib/erreurs'
import { formaterJour } from '../../lib/format'
import { comparerTexte } from '../../lib/tri'
import type { InscriptionJoueur, StatutTournoi } from '../../types/api'
import { useMesTournoisJoueur } from './api'
import { CartesTournoisJoueur } from './CartesTournoisJoueur'
import { LogoEquipe } from '../../components/ui/LogoEquipe'

type IdOnglet = 'tous' | StatutTournoi

// Jamais d'onglet "Annulé" ici : un tournoi ANNULE n'apparait jamais
// dans GET /joueurs/moi/tournois (voir getMesTournois cote backend).
const ONGLETS = [
  { id: 'ACTIF', libelle: 'En cours' },
  { id: 'A_VENIR', libelle: 'À venir' },
  { id: 'TERMINE', libelle: 'Terminé' },
  { id: 'tous', libelle: 'Tous' },
] as const

function correspond(ligne: InscriptionJoueur, recherche: string): boolean {
  const cible = recherche.trim().toLowerCase()
  if (!cible) return true
  return [ligne.tournoi.nom, ligne.tournoi.lieu].some((champ) => champ.toLowerCase().includes(cible))
}

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
    cle: 'equipe',
    entete: 'Équipe',
    largeur: '1.4fr',
    rendu: (l) =>
      l.equipe ? (
        <span className="inline-flex items-center gap-2">
          <LogoEquipe couleur={l.equipe.couleur} logo={l.equipe.logo} />
          {l.equipe.nom}
        </span>
      ) : (
        <span className="text-text-mute">Pas encore assignée</span>
      ),
    comparer: (a, b) => comparerTexte(a.equipe?.nom ?? '', b.equipe?.nom ?? ''),
  },
  {
    cle: 'dates',
    entete: 'Dates',
    largeur: '1.8fr',
    rendu: (l) => `${formaterJour(l.tournoi.dateDebut)} – ${formaterJour(l.tournoi.dateFin)}`,
    comparer: (a, b) => comparerTexte(a.tournoi.dateDebut, b.tournoi.dateDebut),
  },
  {
    cle: 'statut',
    entete: 'Statut',
    largeur: '1fr',
    rendu: (l) => <BadgeStatutTournoi statut={l.tournoi.statut} />,
  },
]

const TONS_STATUT: Record<StatutTournoi, 'primaire' | 'succes' | 'neutre' | 'danger'> = {
  A_VENIR: 'primaire',
  ACTIF: 'succes',
  TERMINE: 'neutre',
  ANNULE: 'danger',
}

export function ListeMesTournoisJoueur() {
  const [onglet, setOnglet] = useState<IdOnglet>('ACTIF')
  const [recherche, setRecherche] = useState('')
  const { data: inscriptions, isLoading, isFetching, isError, error } = useMesTournoisJoueur()

  const lignes = useMemo(() => {
    if (!inscriptions) return undefined
    return inscriptions.filter(
      (ligne) => (onglet === 'tous' || ligne.tournoi.statut === onglet) && correspond(ligne, recherche),
    )
  }, [inscriptions, onglet, recherche])

  return (
    <section>
      <CartePage sansFondMobile>
        <EnTetePage
          titre="Mes tournois"
          description="Les tournois où tu es certifié."
        />

        <Onglets
          libelle="Statut du tournoi"
          variante="segmentee"
          onglets={ONGLETS}
          actif={onglet}
          onChanger={(id) => setOnglet(id as IdOnglet)}
        />

        <PanneauOnglet id={onglet}>
          <div className="mt-6 mb-4 max-w-sm">
            <Champ
              libelle="Rechercher"
              placeholder="Nom, lieu…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
          </div>

          {isError ? (
            <p role="alert" className="text-sm text-danger">
              {messageErreurApi(error)}
            </p>
          ) : (
            <>
              {lignes && lignes.length > 0 && <CartesTournoisJoueur lignes={lignes} />}
              <div className={lignes && lignes.length > 0 ? 'max-md:hidden' : ''}>
                <Tableau
                  key={`${onglet}:${recherche}`}
                  libelle="Liste de mes tournois"
                  colonnes={COLONNES}
                  lignes={lignes}
                  cleLigne={(l) => l.tournoi.id}
                  tonLigne={(l) => TONS_STATUT[l.tournoi.statut]}
                  lienLigne={(l) => `/joueur/tournois/${l.tournoi.id}`}
                  chargement={isLoading}
                  actualisation={isFetching && !isLoading}
                  vide={
                    <EtatVide
                      titre={recherche ? 'Aucun résultat' : 'Aucun tournoi'}
                      description={
                        recherche
                          ? 'Essaie une autre recherche.'
                          : "Tu n'es certifié dans aucun tournoi pour le moment."
                      }
                    />
                  }
                />
              </div>
            </>
          )}
        </PanneauOnglet>
      </CartePage>
    </section>
  )
}
