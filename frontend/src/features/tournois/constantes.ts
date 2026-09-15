import type { AlgorithmeClassement } from '../../types/api'

// Source unique : FicheTournoi (affichage) ET DialogueModifierTournoi
// (formulaire) doivent afficher exactement les memes libelles.
export const LIBELLES_ALGORITHME: Record<AlgorithmeClassement, string> = {
  POINTS_BRUTS: 'Points bruts',
  POINTS_PONDERES: 'Points pondérés',
  POINTS_PONDERES_FAUTES: 'Points pondérés + fautes',
  POINTS_PONDERES_FAUTES_CONTRES: 'Points pondérés + fautes + contres',
}

export const OPTIONS_ALGORITHME = (Object.keys(LIBELLES_ALGORITHME) as AlgorithmeClassement[]).map((valeur) => ({
  valeur,
  libelle: LIBELLES_ALGORITHME[valeur],
}))

// Quels champs de Stat entrent REELLEMENT dans le calcul du score de
// classement pour un algorithme donne (voir calculerScoreClassement cote
// backend) : Points toujours ; Fautes a partir de POINTS_PONDERES_FAUTES ;
// Contres seulement au dernier palier. tempsJeu n'entre JAMAIS dans le
// classement (utile seulement pour l'historique perso du joueur) — donc
// absent d'ici. Source unique pour que la saisie de stats (onglet
// Statistiques) s'adapte a l'algorithme choisi par l'ADMIN pour CE
// tournoi, quel qu'il soit.
export function champsComptantPourLeClassement(algorithme: AlgorithmeClassement): {
  points: boolean
  fautes: boolean
  contres: boolean
} {
  return {
    points: true,
    fautes: algorithme === 'POINTS_PONDERES_FAUTES' || algorithme === 'POINTS_PONDERES_FAUTES_CONTRES',
    contres: algorithme === 'POINTS_PONDERES_FAUTES_CONTRES',
  }
}
