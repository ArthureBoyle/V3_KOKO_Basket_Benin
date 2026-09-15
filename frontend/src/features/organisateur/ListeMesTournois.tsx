import { useMemo, useState } from 'react'
import { CartePage } from '../../components/CartePage'
import { EnTetePage } from '../../components/EnTetePage'
import { Badge, BadgeStatutTournoi } from '../../components/ui/Badge'
import { Ballon } from '../../components/ui/Ballon'
import { Champ } from '../../components/ui/Champ'
import { EtatVide } from '../../components/ui/EtatVide'
import { Onglets, PanneauOnglet } from '../../components/ui/Onglets'
import { Tableau, type Colonne } from '../../components/ui/Tableau'
import { messageErreurApi } from '../../lib/erreurs'
import { formaterJour } from '../../lib/format'
import { comparerNombre, comparerTexte } from '../../lib/tri'
import type { StatutTournoi, TournoiOrganisateur } from '../../types/api'
import { useMesTournois } from '../tournois/api'

type IdOnglet = 'tous' | StatutTournoi

// Jamais d'onglet "Annulé" ici : un tournoi ANNULE n'apparait jamais dans
// GET /tournois/mes-tournois (voir getMesTournois cote backend).
const ONGLETS = [
  { id: 'ACTIF', libelle: 'En cours' },
  { id: 'A_VENIR', libelle: 'À venir' },
  { id: 'TERMINE', libelle: 'Terminé' },
  { id: 'tous', libelle: 'Tous' },
] as const

function correspond(tournoi: TournoiOrganisateur, recherche: string): boolean {
  const cible = recherche.trim().toLowerCase()
  if (!cible) return true
  return [tournoi.nom, tournoi.lieu].some((champ) => champ.toLowerCase().includes(cible))
}

const COLONNES: Colonne<TournoiOrganisateur>[] = [
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

const TONS_STATUT: Record<StatutTournoi, 'primaire' | 'succes' | 'neutre' | 'danger'> = {
  A_VENIR: 'primaire',
  ACTIF: 'succes',
  TERMINE: 'neutre',
  ANNULE: 'danger',
}

// Jamais de "Creer un tournoi" ici : c'est l'ADMIN qui cree, apres
// verification du paiement hors application (creerTournoi, reserve ADMIN
// cote backend). L'organisateur gere ensuite equipes/matchs/scores sur
// les tournois qui lui sont attribues.
export function ListeMesTournois() {
  const [onglet, setOnglet] = useState<IdOnglet>('tous')
  const [recherche, setRecherche] = useState('')
  const { data: tournois, isLoading, isFetching, isError, error } = useMesTournois()

  const lignes = useMemo(() => {
    if (!tournois) return undefined
    return tournois.filter(
      (tournoi) => (onglet === 'tous' || tournoi.statut === onglet) && correspond(tournoi, recherche),
    )
  }, [tournois, onglet, recherche])

  return (
    <section>
      <CartePage>
        <EnTetePage
          titre="Mes tournois"
          description="Les tournois qui te sont attribués."
          icone={<Ballon mode="arret" className="size-6" />}
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
            <Tableau
              key={`${onglet}:${recherche}`}
              libelle="Liste de mes tournois"
              colonnes={COLONNES}
              lignes={lignes}
              cleLigne={(tournoi) => tournoi.id}
              tonLigne={(tournoi) => TONS_STATUT[tournoi.statut]}
              lienLigne={(tournoi) => `/organisateur/tournois/${tournoi.id}`}
              chargement={isLoading}
              actualisation={isFetching && !isLoading}
              vide={
                <EtatVide
                  titre={recherche ? 'Aucun résultat' : 'Aucun tournoi'}
                  description={recherche ? 'Essaie une autre recherche.' : "Aucun tournoi ne t'est attribué pour le moment."}
                />
              }
            />
          )}
        </PanneauOnglet>
      </CartePage>
    </section>
  )
}
