import { useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Champ } from '../../components/ui/Champ'
import { EtatVide } from '../../components/ui/EtatVide'
import { Onglets, PanneauOnglet } from '../../components/ui/Onglets'
import { Tableau, type Colonne } from '../../components/ui/Tableau'
import { messageErreurApi } from '../../lib/erreurs'
import { comparerNombre, comparerTexte } from '../../lib/tri'
import type { EquipeClassee, JoueurClasse } from '../../types/api'
import { useClassementEquipes, useClassementJoueurs } from '../tournois/apiClassement'
import { medaille, styleLignePodium } from '../tournois/constantes'

interface Props {
  tournoiId: number
  // Met en avant sa propre ligne dans le classement (voir styleLigneMoi)
  // — null tant qu'il n'est pas encore place dans une equipe.
  monJoueurId: number | null
}

// Contour du joueur connecte : TOUJOURS visible, meme dernier — donc
// jamais "succes" (vert, qui suggererait une bonne performance) ni une
// couleur figee comme le podium (or/argent/bronze, une couleur d'OBJET).
// Ici il s'agit juste de "c'est toi" : la couleur d'ACCENT du theme
// actuel (var(--primary), differente en violet/terre/menthe), avec le
// meme traitement contour+halo que le podium. Le podium reste
// prioritaire si les deux s'appliquent (rester premier ET soi-meme).
function styleLigneMoi(rang: number, estMoi: boolean) {
  const podium = styleLignePodium(rang)
  if (podium) return podium
  if (!estMoi) return undefined
  return {
    borderWidth: '2px',
    borderColor: 'var(--primary)',
    boxShadow: '0 0 0 1px var(--primary), 0 0 28px 3px color-mix(in oklab, var(--primary) 70%, transparent)',
  }
}

type IdOnglet = 'classement-joueurs' | 'classement-equipes'

const ONGLETS = [
  { id: 'classement-joueurs', libelle: 'Joueurs' },
  { id: 'classement-equipes', libelle: 'Équipes' },
] as const

// Pas de colonnes Fautes/Contres/Minutes ni de marquage ✓/— ici
// (contrairement a OngletClassement, cote Admin/Organisateur) : le
// joueur ne peut pas lire l'algorithme du tournoi (GET /tournois/:id lui
// est ferme, voir accesTournoi.ts) — seul le score final, deja calcule,
// lui est accessible.
function colonnesJoueurs(nomEquipe: (id: number) => string, monJoueurId: number | null): Colonne<JoueurClasse>[] {
  return [
    {
      cle: 'rang',
      entete: '#',
      largeur: '0.5fr',
      numerique: true,
      align: 'centre',
      // Podium (top 3) : medaille au lieu du simple chiffre — c'est
      // "l'effet" que les autres rangs n'ont pas (voir styleLignePodium
      // pour le liseret/halo assorti).
      rendu: (j) => {
        const m = medaille(j.rang)
        return m ? (
          <span aria-label={`Rang ${j.rang}`} className="text-xl leading-none">
            {m}
          </span>
        ) : (
          j.rang
        )
      },
    },
    {
      cle: 'joueur',
      entete: 'Joueur',
      largeur: '1.8fr',
      rendu: (j) => (
        <>
          <p>
            {j.prenom} {j.nomLegal}
            {j.joueurId === monJoueurId && <span className="ml-2 text-xs text-primary-text">(toi)</span>}
          </p>
          <p className="font-mono text-xs text-text-mute">{j.idKoko}</p>
        </>
      ),
      comparer: (a, b) => comparerTexte(a.nomLegal ?? '', b.nomLegal ?? ''),
    },
    {
      cle: 'equipe',
      entete: 'Équipe',
      largeur: '1.2fr',
      rendu: (j) => nomEquipe(j.equipeId),
      comparer: (a, b) => comparerTexte(nomEquipe(a.equipeId), nomEquipe(b.equipeId)),
    },
    {
      cle: 'matchsJoues',
      entete: 'Matchs',
      largeur: '1fr',
      numerique: true,
      align: 'centre',
      rendu: (j) => (
        <span className="inline-flex items-center gap-1.5">
          {j.matchsJoues}
          {j.faibleEchantillon && <Badge ton="alerte">échantillon faible</Badge>}
        </span>
      ),
      comparer: (a, b) => comparerNombre(a.matchsJoues, b.matchsJoues),
    },
    {
      cle: 'totalPts',
      entete: 'Points',
      largeur: '1fr',
      numerique: true,
      align: 'centre',
      rendu: (j) => j.totalPts,
      comparer: (a, b) => comparerNombre(a.totalPts, b.totalPts),
    },
    {
      cle: 'score',
      entete: 'Score',
      largeur: '1fr',
      numerique: true,
      align: 'centre',
      rendu: (j) => (
        <span className="font-medium tabular-nums">
          {j.score < 0 ? `− ${Math.abs(j.score).toFixed(1)}` : j.score.toFixed(1)}
        </span>
      ),
      comparer: (a, b) => comparerNombre(a.score, b.score),
    },
  ]
}

const COLONNES_EQUIPES: Colonne<EquipeClassee>[] = [
  {
    cle: 'rang',
    entete: '#',
    largeur: '0.5fr',
    numerique: true,
    align: 'centre',
    rendu: (e) => {
      const m = medaille(e.rang)
      return m ? (
        <span aria-label={`Rang ${e.rang}`} className="text-xl leading-none">
          {m}
        </span>
      ) : (
        e.rang
      )
    },
  },
  {
    cle: 'nom',
    entete: 'Équipe',
    largeur: '2fr',
    rendu: (e) => (
      <span className="inline-flex items-center gap-2">
        <span aria-hidden="true" className="size-3 shrink-0 rounded-full border border-border" style={{ backgroundColor: e.couleur }} />
        {e.nom}
      </span>
    ),
    comparer: (a, b) => comparerTexte(a.nom, b.nom),
  },
  {
    cle: 'victoires',
    entete: 'Victoires',
    largeur: '1fr',
    numerique: true,
    align: 'centre',
    rendu: (e) => e.victoires,
    comparer: (a, b) => comparerNombre(a.victoires, b.victoires),
  },
  {
    cle: 'defaites',
    entete: 'Défaites',
    largeur: '1fr',
    numerique: true,
    align: 'centre',
    rendu: (e) => e.defaites,
    comparer: (a, b) => comparerNombre(a.defaites, b.defaites),
  },
  {
    cle: 'points',
    entete: 'Points',
    largeur: '1fr',
    numerique: true,
    align: 'centre',
    rendu: (e) => <span className="font-medium">{e.points}</span>,
    comparer: (a, b) => comparerNombre(a.points, b.points),
  },
]

export function OngletClassementJoueur({ tournoiId, monJoueurId }: Props) {
  const [onglet, setOnglet] = useState<IdOnglet>('classement-joueurs')
  const [filtreMatchsJoues, setFiltreMatchsJoues] = useState('')
  const matchsJoues = filtreMatchsJoues.trim() === '' ? null : Number(filtreMatchsJoues)

  const joueurs = useClassementJoueurs(tournoiId, matchsJoues)
  const equipes = useClassementEquipes(tournoiId)
  // Les noms d'equipe viennent du classement-equipes lui-meme : le joueur
  // n'a pas acces a GET /equipes (reserve ADMIN/organisateur proprietaire).
  const nomEquipe = (id: number) => equipes.data?.find((e) => e.id === id)?.nom ?? '—'

  return (
    <div className="flex flex-col gap-5">
      <Onglets libelle="Type de classement" variante="segmentee" onglets={ONGLETS} actif={onglet} onChanger={(id) => setOnglet(id as IdOnglet)} />

      <PanneauOnglet id={onglet}>
        {onglet === 'classement-joueurs' ? (
          <div className="flex flex-col gap-4">
            <div className="max-w-xs">
              <Champ
                libelle="Filtrer par nombre de matchs joués"
                type="number"
                min={0}
                placeholder="Tous"
                aide="Compare seulement les joueurs ayant joué exactement ce nombre de matchs"
                value={filtreMatchsJoues}
                onChange={(e) => setFiltreMatchsJoues(e.target.value)}
              />
            </div>
            {joueurs.isError ? (
              <p role="alert" className="text-sm text-danger">
                {messageErreurApi(joueurs.error)}
              </p>
            ) : (
              <Tableau
                key={matchsJoues ?? 'tous'}
                libelle="Classement des joueurs"
                colonnes={colonnesJoueurs(nomEquipe, monJoueurId)}
                lignes={joueurs.data}
                cleLigne={(j) => j.joueurId}
                styleLigne={(j) => styleLigneMoi(j.rang, j.joueurId === monJoueurId)}
                chargement={joueurs.isLoading}
                actualisation={joueurs.isFetching && !joueurs.isLoading}
                vide={
                  <EtatVide
                    titre={matchsJoues !== null ? 'Aucun joueur avec ce nombre de matchs' : 'Aucun classement disponible'}
                    description="Un classement apparaît dès qu'un match est terminé avec des statistiques saisies."
                  />
                }
              />
            )}
          </div>
        ) : equipes.isError ? (
          <p role="alert" className="text-sm text-danger">
            {messageErreurApi(equipes.error)}
          </p>
        ) : (
          <Tableau
            libelle="Classement des équipes"
            colonnes={COLONNES_EQUIPES}
            lignes={equipes.data}
            cleLigne={(e) => e.id}
            styleLigne={(e) => styleLignePodium(e.rang)}
            chargement={equipes.isLoading}
            actualisation={equipes.isFetching && !equipes.isLoading}
            vide={<EtatVide titre="Aucune équipe" description="Le classement des équipes apparaît dès le premier match terminé." />}
          />
        )}
      </PanneauOnglet>
    </div>
  )
}
