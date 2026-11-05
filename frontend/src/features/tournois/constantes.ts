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

// Couleurs d'OBJET (medaille), pas des tokens de theme — meme
// raisonnement que --ballon-* (Ballon.tsx) : l'or/l'argent/le bronze
// sont des couleurs REELLES, identiques dans les 3 themes. Seuls les 3
// premiers rangs d'un classement (joueurs ou equipes) les recoivent.
const COULEURS_PODIUM: Record<number, string> = {
  1: '#d4af37',
  2: '#c0c0c0',
  3: '#cd7f32',
}

const MEDAILLES: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export function medaille(rang: number): string | null {
  return MEDAILLES[rang] ?? null
}

// A passer en styleLigne du Tableau : contour COMPLET (pas juste le
// liseret gauche) + halo large et lumineux — le podium doit se voir
// tout de suite, pas etre un simple detail sur le cote.
export function styleLignePodium(
  rang: number,
): { borderWidth: string; borderColor: string; boxShadow: string } | undefined {
  const couleur = COULEURS_PODIUM[rang]
  if (!couleur) return undefined
  return {
    borderWidth: '2px',
    borderColor: couleur,
    boxShadow: `0 0 0 1px ${couleur}, 0 0 28px 3px color-mix(in oklab, ${couleur} 70%, transparent)`,
  }
}
