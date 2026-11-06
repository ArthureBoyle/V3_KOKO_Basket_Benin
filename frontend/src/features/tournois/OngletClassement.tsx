import { useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Champ } from '../../components/ui/Champ'
import { EtatVide } from '../../components/ui/EtatVide'
import { LogoEquipe } from '../../components/ui/LogoEquipe'
import { Onglets, PanneauOnglet } from '../../components/ui/Onglets'
import { ClassementEquipesMobile, ClassementJoueursMobile } from './ClassementMobile'
import { Tableau, type Colonne } from '../../components/ui/Tableau'
import { messageErreurApi } from '../../lib/erreurs'
import { comparerNombre, comparerTexte } from '../../lib/tri'
import type { AlgorithmeClassement, EquipeClassee, EquipeResumeTournoi, JoueurClasse } from '../../types/api'
import { useClassementEquipes, useClassementJoueurs } from './apiClassement'
import { champsComptantPourLeClassement, medaille, styleLignePodium } from './constantes'

interface Props {
  tournoiId: number
  equipes: EquipeResumeTournoi[]
  algorithmeClassement: AlgorithmeClassement
}

type IdOnglet = 'classement-joueurs' | 'classement-equipes'

// Prefixe "classement-" : Onglets/PanneauOnglet construisent leurs id DOM
// directement depuis cet id ("onglet-equipes"...), qui entrerait sinon en
// collision avec l'onglet "Équipes" de la fiche tournoi elle-meme (2
// elements avec le meme id sur la meme page — invalide en HTML, source
// d'ambiguite pour les lecteurs d'ecran ET les tests).
const ONGLETS = [
  { id: 'classement-joueurs', libelle: 'Joueurs' },
  { id: 'classement-equipes', libelle: 'Équipes' },
] as const

// "✓"/"—" dans l'entete : meme convention que la saisie de stats et le
// mode vision (voir DialogueStatsMatch, DialogueCriteresAlgorithme) —
// un seul et meme langage visuel pour "ce champ compte pour CE
// tournoi", partout dans l'appli.
function colonnesJoueurs(
  nomEquipe: (id: number) => string,
  champs: { points: boolean; fautes: boolean; contres: boolean },
): Colonne<JoueurClasse>[] {
  return [
  {
    cle: 'rang',
    entete: '#',
    largeur: '0.5fr',
    numerique: true,
    align: 'centre',
    // Podium (top 3) : medaille au lieu du simple chiffre (voir
    // styleLignePodium pour le liseret/halo assorti sur la ligne).
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
        <p>{j.prenom} {j.nomLegal}</p>
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
    entete: `Points ${champs.points ? '✓' : '—'}`,
    largeur: '1fr',
    numerique: true,
    align: 'centre',
    rendu: (j) => j.totalPts,
    comparer: (a, b) => comparerNombre(a.totalPts, b.totalPts),
  },
  {
    cle: 'totalFautes',
    entete: `Fautes ${champs.fautes ? '✓' : '—'}`,
    largeur: '1fr',
    numerique: true,
    align: 'centre',
    rendu: (j) => j.totalFautes,
    comparer: (a, b) => comparerNombre(a.totalFautes, b.totalFautes),
  },
  {
    cle: 'totalContres',
    entete: `Contres ${champs.contres ? '✓' : '—'}`,
    largeur: '1fr',
    numerique: true,
    align: 'centre',
    rendu: (j) => j.totalContres,
    comparer: (a, b) => comparerNombre(a.totalContres, b.totalContres),
  },
  {
    cle: 'totalTempsJeu',
    entete: 'Minutes —',
    largeur: '1fr',
    numerique: true,
    align: 'centre',
    rendu: (j) => j.totalTempsJeu,
    comparer: (a, b) => comparerNombre(a.totalTempsJeu, b.totalTempsJeu),
  },
  {
    cle: 'score',
    entete: 'Score',
    largeur: '1fr',
    numerique: true,
    align: 'centre',
    // Le signe colle au chiffre ("-0.2") se lisait mal a cote des
    // valeurs positives, alignees sans signe : un espace fin separe
    // explicitement le "-" du nombre pour les scores negatifs.
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
        <LogoEquipe couleur={e.couleur} logo={e.logo} className="size-5" />
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

// Classement 100% recalcule par le backend a chaque appel (jamais
// stocke) : rien ici n'est modifiable, seulement lu.
export function OngletClassement({ tournoiId, equipes: equipesDuTournoi, algorithmeClassement }: Props) {
  const [onglet, setOnglet] = useState<IdOnglet>('classement-joueurs')
  const [filtreMatchsJoues, setFiltreMatchsJoues] = useState('')
  const matchsJoues = filtreMatchsJoues.trim() === '' ? null : Number(filtreMatchsJoues)
  const nomEquipe = (id: number) => equipesDuTournoi.find((e) => e.id === id)?.nom ?? '—'
  const champs = champsComptantPourLeClassement(algorithmeClassement)

  const joueurs = useClassementJoueurs(tournoiId, matchsJoues)
  const equipes = useClassementEquipes(tournoiId)

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
              <>
                {joueurs.data && joueurs.data.length > 0 && (
                  <ClassementJoueursMobile joueurs={joueurs.data} nomEquipe={nomEquipe} />
                )}
                <div className={joueurs.data && joueurs.data.length > 0 ? 'max-md:hidden' : ''}>
              <Tableau
                key={matchsJoues ?? 'tous'}
                libelle="Classement des joueurs"
                colonnes={colonnesJoueurs(nomEquipe, champs)}
                lignes={joueurs.data}
                cleLigne={(j) => j.joueurId}
                styleLigne={(j) => styleLignePodium(j.rang)}
                chargement={joueurs.isLoading}
                actualisation={joueurs.isFetching && !joueurs.isLoading}
                vide={
                  <EtatVide
                    titre={matchsJoues !== null ? 'Aucun joueur avec ce nombre de matchs' : 'Aucun classement disponible'}
                    description="Un classement apparaît dès qu'un match est terminé avec des statistiques saisies."
                  />
                }
              />
                </div>
              </>
            )}
          </div>
        ) : equipes.isError ? (
          <p role="alert" className="text-sm text-danger">
            {messageErreurApi(equipes.error)}
          </p>
        ) : (
          <>
          {equipes.data && equipes.data.length > 0 && <ClassementEquipesMobile equipes={equipes.data} />}
          <div className={equipes.data && equipes.data.length > 0 ? 'max-md:hidden' : ''}>
          <Tableau
            libelle="Classement des équipes"
            colonnes={COLONNES_EQUIPES}
            lignes={equipes.data}
            cleLigne={(e) => e.id}
            styleLigne={(e) => styleLignePodium(e.rang)}
            chargement={equipes.isLoading}
            actualisation={equipes.isFetching && !equipes.isLoading}
            vide={<EtatVide titre="Aucune équipe" description="Crée des équipes (onglet Équipes) pour voir un classement." />}
          />
          </div>
          </>
        )}
      </PanneauOnglet>
    </div>
  )
}
