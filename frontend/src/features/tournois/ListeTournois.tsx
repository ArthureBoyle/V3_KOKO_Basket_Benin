import { useMemo, useState } from 'react'
import { CartePage } from '../../components/CartePage'
import { EnTetePage } from '../../components/EnTetePage'
import { Badge, BadgeStatutTournoi } from '../../components/ui/Badge'
import { Bouton } from '../../components/ui/Bouton'
import { Champ } from '../../components/ui/Champ'
import { EtatVide } from '../../components/ui/EtatVide'
import { Onglets, PanneauOnglet } from '../../components/ui/Onglets'
import { Tableau, type Colonne } from '../../components/ui/Tableau'
import { messageErreurApi } from '../../lib/erreurs'
import { formaterJour } from '../../lib/format'
import { comparerNombre, comparerTexte } from '../../lib/tri'
import type { StatutTournoi, TournoiAdmin } from '../../types/api'
import { useTournois } from './api'
import { CartesTournois } from './CartesTournois'
import { DialogueCreerTournoi } from './DialogueCreerTournoi'

type IdOnglet = 'tous' | StatutTournoi

const ONGLETS = [
  { id: 'ACTIF', libelle: 'En cours' },
  { id: 'A_VENIR', libelle: 'À venir' },
  { id: 'TERMINE', libelle: 'Terminé' },
  { id: 'tous', libelle: 'Tous' },
  { id: 'ANNULE', libelle: 'Annulé' },
] as const

// Recherche cote front (une seule requete GET /tournois) : nom, lieu, et
// nom/prenom de l'organisateur.
function correspond(tournoi: TournoiAdmin, recherche: string): boolean {
  const cible = recherche.trim().toLowerCase()
  if (!cible) return true
  const champs = [tournoi.nom, tournoi.lieu, tournoi.organisateur.nom, tournoi.organisateur.prenom]
  return champs.some((champ) => champ.toLowerCase().includes(cible))
}

const COLONNES: Colonne<TournoiAdmin>[] = [
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
    comparer: (a, b) => comparerTexte(a.nom, b.nom),
  },
  {
    cle: 'organisateur',
    entete: 'Organisateur',
    largeur: '1.6fr',
    rendu: (t) => `${t.organisateur.prenom} ${t.organisateur.nom}`,
    comparer: (a, b) => comparerTexte(a.organisateur.nom, b.organisateur.nom),
  },
  {
    cle: 'dates',
    entete: 'Dates',
    largeur: '1.8fr',
    rendu: (t) => `${formaterJour(t.dateDebut)} – ${formaterJour(t.dateFin)}`,
    comparer: (a, b) => comparerTexte(a.dateDebut, b.dateDebut),
  },
  {
    cle: 'licences',
    entete: 'Licences',
    largeur: '0.9fr',
    numerique: true,
    align: 'centre',
    rendu: (t) => `${t.compteurs.joueurs}/${t.licencesMax}`,
    comparer: (a, b) => comparerNombre(a.compteurs.joueurs, b.compteurs.joueurs),
  },
  {
    cle: 'equipes',
    entete: 'Équipes',
    largeur: '0.9fr',
    numerique: true,
    align: 'centre',
    rendu: (t) => `${t.compteurs.equipes}/${t.equipesMax}`,
    comparer: (a, b) => comparerNombre(a.compteurs.equipes, b.compteurs.equipes),
  },
  {
    cle: 'statut',
    entete: 'Statut',
    largeur: '1.4fr',
    rendu: (t) => (
      <div className="flex flex-wrap items-center gap-2">
        <BadgeStatutTournoi statut={t.statut} />
        {t.compteurs.scoresASaisir > 0 && (
          <Badge ton="alerte" pulse>
            {t.compteurs.scoresASaisir} à saisir
          </Badge>
        )}
      </div>
    ),
  },
]

// Liseret gauche aligne sur le badge de statut (voir Badge.tsx).
const TONS_STATUT: Record<StatutTournoi, 'primaire' | 'succes' | 'neutre' | 'danger'> = {
  A_VENIR: 'primaire',
  ACTIF: 'succes',
  TERMINE: 'neutre',
  ANNULE: 'danger',
}

export function ListeTournois() {
  const [onglet, setOnglet] = useState<IdOnglet>('ACTIF')
  const [recherche, setRecherche] = useState('')
  const [creationOuverte, setCreationOuverte] = useState(false)
  const { data: tournois, isLoading, isFetching, isError, error } = useTournois()

  const lignes = useMemo(() => {
    if (!tournois) return undefined
    return tournois.filter(
      (tournoi) => (onglet === 'tous' || tournoi.statut === onglet) && correspond(tournoi, recherche),
    )
  }, [tournois, onglet, recherche])

  return (
    <section>
      <CartePage sansFondMobile>
        <EnTetePage
          titre="Tournois"
          description="Compétitions créées après vérification du paiement hors application."
          actions={
            <Bouton magnetique onClick={() => setCreationOuverte(true)}>
              Créer un tournoi
            </Bouton>
          }
        />

        {/* segmentee : memes pilules pleines que la fiche tournoi (Infos/
            Licences/...), pour que le meme type de filtre se reconnaisse
            partout dans l'app plutot que du texte souligne ici et des
            boutons ailleurs. */}
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
              placeholder="Nom, lieu, organisateur…"
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
            {lignes && lignes.length > 0 && <CartesTournois tournois={lignes} lienBase="/admin/tournois" />}
            <div className={lignes && lignes.length > 0 ? 'max-md:hidden' : ''}>
            <Tableau
              // Cle = onglet + recherche : force un vrai remontage de toutes
              // les cartes a chaque changement, pour que la cascade d'apparition
              // rejoue (pas seulement au premier rendu de la page).
              key={`${onglet}:${recherche}`}
              libelle="Liste des tournois"
              colonnes={COLONNES}
              lignes={lignes}
              cleLigne={(tournoi) => tournoi.id}
              tonLigne={(tournoi) => TONS_STATUT[tournoi.statut]}
              lienLigne={(tournoi) => `/admin/tournois/${tournoi.id}`}
              chargement={isLoading}
              actualisation={isFetching && !isLoading}
              vide={
                <EtatVide
                  titre={recherche ? 'Aucun résultat' : 'Aucun tournoi'}
                  description={recherche ? 'Essaie une autre recherche.' : 'Crée le premier tournoi pour commencer.'}
                />
              }
            />
            </div>
            </>
          )}
        </PanneauOnglet>
      </CartePage>

      <DialogueCreerTournoi ouvert={creationOuverte} onFermer={() => setCreationOuverte(false)} />
    </section>
  )
}
