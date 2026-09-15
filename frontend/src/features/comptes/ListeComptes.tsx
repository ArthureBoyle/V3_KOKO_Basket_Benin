import { useMemo, useState } from 'react'
import { CartePage } from '../../components/CartePage'
import { EnTetePage } from '../../components/EnTetePage'
import { Badge } from '../../components/ui/Badge'
import { Ballon } from '../../components/ui/Ballon'
import { Bouton } from '../../components/ui/Bouton'
import { Champ } from '../../components/ui/Champ'
import { EtatVide } from '../../components/ui/EtatVide'
import { Onglets, PanneauOnglet } from '../../components/ui/Onglets'
import { Tableau, type Colonne } from '../../components/ui/Tableau'
import { messageErreurApi } from '../../lib/erreurs'
import { formaterAge } from '../../lib/format'
import { comparerNombre, comparerTexte } from '../../lib/tri'
import type { Compte } from '../../types/api'
import { useComptes } from './api'
import { DialogueCreerJoueur } from './DialogueCreerJoueur'
import { DialogueCreerOrganisateur } from './DialogueCreerOrganisateur'

type IdOnglet = 'joueurs' | 'organisateurs'

const ONGLETS = [
  { id: 'joueurs', libelle: 'Joueurs' },
  { id: 'organisateurs', libelle: 'Organisateurs' },
] as const

// Recherche cote front (une seule requete GET /comptes, pas de nouvel
// appel a chaque frappe) : nom, prenom, email KOKO, et idKoko pour un joueur.
function correspond(compte: Compte, recherche: string): boolean {
  const cible = recherche.trim().toLowerCase()
  if (!cible) return true
  const champs = [compte.nom, compte.prenom, compte.email, compte.joueur?.idKoko ?? '']
  return champs.some((champ) => champ.toLowerCase().includes(cible))
}

function BadgeActif({ actif }: { actif: boolean }) {
  return actif ? <Badge ton="succes">Actif</Badge> : <Badge ton="danger">Désactivé</Badge>
}

const COLONNES_JOUEURS: Colonne<Compte>[] = [
  {
    cle: 'idKoko',
    entete: 'ID KOKO',
    largeur: '1.6fr',
    rendu: (c) => <span className="font-mono text-xs">{c.joueur?.idKoko}</span>,
  },
  {
    cle: 'nom',
    entete: 'Nom',
    largeur: '2fr',
    rendu: (c) => (
      <>
        {c.prenom} {c.nom}
        {c.joueur?.surnom && <span className="text-text-mute"> « {c.joueur.surnom} »</span>}
      </>
    ),
    comparer: (a, b) => comparerTexte(a.nom, b.nom),
  },
  {
    cle: 'age',
    entete: 'Âge',
    largeur: '0.9fr',
    numerique: true,
    rendu: (c) => formaterAge(c.joueur!.age),
    comparer: (a, b) => comparerNombre(a.joueur!.age, b.joueur!.age),
  },
  {
    cle: 'tournois',
    entete: 'Tournois',
    largeur: '0.9fr',
    numerique: true,
    align: 'centre',
    rendu: (c) => c.tournois.length,
    comparer: (a, b) => comparerNombre(a.tournois.length, b.tournois.length),
  },
  { cle: 'statut', entete: 'Statut', largeur: '0.9fr', rendu: (c) => <BadgeActif actif={c.actif} /> },
]

const COLONNES_ORGANISATEURS: Colonne<Compte>[] = [
  {
    cle: 'nom',
    entete: 'Nom',
    largeur: '1.8fr',
    rendu: (c) => `${c.prenom} ${c.nom}`,
    comparer: (a, b) => comparerTexte(a.nom, b.nom),
  },
  {
    cle: 'email',
    entete: 'Email KOKO',
    largeur: '2fr',
    rendu: (c) => <span className="font-mono text-xs">{c.email}</span>,
  },
  {
    cle: 'tournois',
    entete: 'Tournois',
    largeur: '0.9fr',
    numerique: true,
    align: 'centre',
    rendu: (c) => c.tournois.length,
    comparer: (a, b) => comparerNombre(a.tournois.length, b.tournois.length),
  },
  { cle: 'statut', entete: 'Statut', largeur: '0.9fr', rendu: (c) => <BadgeActif actif={c.actif} /> },
]

// Liseret gauche : vert si actif, rouge si desactive — meme ton que le badge.
const tonSelonStatut = (compte: Compte) => (compte.actif ? 'succes' : 'danger')

export function ListeComptes() {
  const [onglet, setOnglet] = useState<IdOnglet>('joueurs')
  const [recherche, setRecherche] = useState('')
  const [creationOuverte, setCreationOuverte] = useState(false)
  const { data: comptes, isLoading, isFetching, isError, error } = useComptes()

  const lignes = useMemo(() => {
    if (!comptes) return undefined
    const role = onglet === 'joueurs' ? 'JOUEUR' : 'ORGANISATEUR'
    return comptes.filter((compte) => compte.role === role && correspond(compte, recherche))
  }, [comptes, onglet, recherche])

  return (
    <section>
      <CartePage>
        <EnTetePage
          titre="Comptes"
          description="Joueurs et organisateurs créés par l'administration."
          icone={<Ballon mode="arret" className="size-6" />}
          actions={
            <Bouton magnetique onClick={() => setCreationOuverte(true)}>
              Créer {onglet === 'joueurs' ? 'un joueur' : 'un organisateur'}
            </Bouton>
          }
        />

        {/* Segmentee : seulement 2 options, et ce sont elles le contenu de
            l'ecran (pas des onglets secondaires) — meritent la largeur. */}
        <div className="max-w-sm">
          <Onglets
            libelle="Type de compte"
            variante="segmentee"
            onglets={ONGLETS}
            actif={onglet}
            onChanger={(id) => setOnglet(id as IdOnglet)}
          />
        </div>
        <PanneauOnglet id={onglet}>
          <div className="mt-6 mb-4 max-w-sm">
            <Champ
              libelle="Rechercher"
              placeholder="Nom, prénom, email, ID KOKO…"
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
              // Cle = onglet + recherche : force un vrai remontage de toutes
              // les cartes a chaque changement, pour que la cascade d'apparition
              // rejoue (pas seulement au premier rendu de la page).
              key={`${onglet}:${recherche}`}
              libelle={onglet === 'joueurs' ? 'Liste des joueurs' : 'Liste des organisateurs'}
              colonnes={onglet === 'joueurs' ? COLONNES_JOUEURS : COLONNES_ORGANISATEURS}
              lignes={lignes}
              cleLigne={(compte) => compte.id}
              tonLigne={tonSelonStatut}
              lienLigne={(compte) => `/admin/comptes/${compte.id}`}
              chargement={isLoading}
              actualisation={isFetching && !isLoading}
              vide={
                <EtatVide
                  titre={
                    recherche ? 'Aucun résultat' : onglet === 'joueurs' ? 'Aucun joueur' : 'Aucun organisateur'
                  }
                  description={
                    recherche
                      ? 'Essaie une autre recherche.'
                      : 'Crée le premier compte pour commencer.'
                  }
                />
              }
            />
          )}
        </PanneauOnglet>
      </CartePage>

      <DialogueCreerJoueur ouvert={creationOuverte && onglet === 'joueurs'} onFermer={() => setCreationOuverte(false)} />
      <DialogueCreerOrganisateur
        ouvert={creationOuverte && onglet === 'organisateurs'}
        onFermer={() => setCreationOuverte(false)}
      />
    </section>
  )
}
