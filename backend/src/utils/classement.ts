// ================================================
// CLASSEMENT — fonctions pures (aucun appel Prisma ici), testees en
// unitaire. Le controller se charge de fetch les donnees et de leur
// passer ici deja pretes.
// ================================================
import { calculerStatutMatch } from "./matchStatut";

export interface MatchPourClassement {
  id: number;
  equipe1Id: number;
  equipe2Id: number;
  score1: number | null;
  score2: number | null;
  statut: string;
  date: Date;
}

export interface StatPourClassement {
  matchId: number;
  joueurId: number;
  equipeId: number;
  points: number;
  fautes: number;
  contres: number;
  tempsJeu: number;
}

export interface JoueurInfo {
  id: number;
  idKoko: string;
  nomLegal: string;
  prenom: string;
}

export interface EquipeInfo {
  id: number;
  nom: string;
  couleur: string;
}

export interface CoefficientsClassement {
  k: number;
  malusFautes: number;
  boostContres: number;
}

export type AlgorithmeClassement =
  | "POINTS_BRUTS"
  | "POINTS_PONDERES"
  | "POINTS_PONDERES_FAUTES"
  | "POINTS_PONDERES_FAUTES_CONTRES";

interface ContexteTournoi {
  moyennePts: number;
  moyenneFautes: number;
  moyenneContres: number;
}

// Moyenne bayesienne (shrinkage estimator, meme famille que la note
// ponderee IMDb) : plus matchsJoues est grand, plus le score se
// rapproche de la vraie moyenne du joueur ; plus il est petit, plus il
// est tire vers la moyenne du tournoi (contexte) — jamais ecrase, juste
// "pas encore prouve".
function scorePondere(total: number, matchsJoues: number, moyenneTournoi: number, k: number): number {
  return (total + k * moyenneTournoi) / (matchsJoues + k);
}

// Une seule fonction qui tranche selon l'algorithme choisi par l'ADMIN
// pour ce tournoi — chaque niveau ajoute un terme au precedent, jamais
// un calcul totalement different.
export function calculerScoreClassement(
  joueur: { totalPts: number; totalFautes: number; totalContres: number; matchsJoues: number },
  contexte: ContexteTournoi,
  algorithme: AlgorithmeClassement,
  coefficients: CoefficientsClassement
): number {
  if (algorithme === "POINTS_BRUTS") {
    return joueur.totalPts;
  }

  const scorePoints = scorePondere(joueur.totalPts, joueur.matchsJoues, contexte.moyennePts, coefficients.k);
  if (algorithme === "POINTS_PONDERES") {
    return scorePoints;
  }

  const malus =
    coefficients.malusFautes *
    scorePondere(joueur.totalFautes, joueur.matchsJoues, contexte.moyenneFautes, coefficients.k);
  if (algorithme === "POINTS_PONDERES_FAUTES") {
    return scorePoints - malus;
  }

  // POINTS_PONDERES_FAUTES_CONTRES
  const boost =
    coefficients.boostContres *
    scorePondere(joueur.totalContres, joueur.matchsJoues, contexte.moyenneContres, coefficients.k);
  return scorePoints - malus + boost;
}

export interface JoueurClasse {
  rang: number;
  joueurId: number;
  idKoko: string | null;
  nomLegal: string | null;
  prenom: string | null;
  equipeId: number;
  totalPts: number;
  totalFautes: number;
  totalContres: number;
  totalTempsJeu: number;
  matchsJoues: number;
  score: number;
  // Informatif seulement — l'algorithme gere deja l'equite via le
  // lissage, ce drapeau ne change jamais l'ordre, il aide juste a lire
  // le classement.
  faibleEchantillon: boolean;
}

// GET .../classement — agrege les Stat des matchs REELLEMENT TERMINE
// (recalcule via calculerStatutMatch, jamais via la colonne statut
// brute) et applique l'algorithme/les coefficients choisis pour ce
// tournoi.
export interface ReglagesClassement {
  algorithmeClassement: AlgorithmeClassement;
  coefficientLissage: number; // k
  coefficientMalusFautes: number; // c
  coefficientBoostContres: number; // b
}

export function calculerClassementJoueurs(
  stats: StatPourClassement[],
  matches: MatchPourClassement[],
  joueursInfo: Map<number, JoueurInfo>,
  reglages: ReglagesClassement
): JoueurClasse[] {
  const matchsTermines = matches.filter((m) => calculerStatutMatch(m) === "TERMINE");
  const idsMatchsTermines = new Set(matchsTermines.map((m) => m.id));
  const statsValides = stats.filter((s) => idsMatchsTermines.has(s.matchId));

  // Nombre de matchs TERMINE par equipe — PAS le total du tournoi :
  // toutes les equipes n'ont pas forcement joue le meme nombre de
  // matchs a un instant donne (bye, report, calendrier asymetrique).
  // Comparer un joueur au total de SA propre equipe est plus juste.
  const matchsTerminesParEquipe = new Map<number, number>();
  for (const match of matchsTermines) {
    matchsTerminesParEquipe.set(match.equipe1Id, (matchsTerminesParEquipe.get(match.equipe1Id) ?? 0) + 1);
    matchsTerminesParEquipe.set(match.equipe2Id, (matchsTerminesParEquipe.get(match.equipe2Id) ?? 0) + 1);
  }

  interface Agrege {
    joueurId: number;
    equipeId: number;
    totalPts: number;
    totalFautes: number;
    totalContres: number;
    totalTempsJeu: number;
    matchsJoues: number;
  }

  const agreges = new Map<number, Agrege>();
  for (const stat of statsValides) {
    const existant = agreges.get(stat.joueurId);
    if (existant) {
      existant.totalPts += stat.points;
      existant.totalFautes += stat.fautes;
      existant.totalContres += stat.contres;
      existant.totalTempsJeu += stat.tempsJeu;
      existant.matchsJoues += 1;
    } else {
      agreges.set(stat.joueurId, {
        joueurId: stat.joueurId,
        equipeId: stat.equipeId,
        totalPts: stat.points,
        totalFautes: stat.fautes,
        totalContres: stat.contres,
        totalTempsJeu: stat.tempsJeu,
        matchsJoues: 1,
      });
    }
  }

  const nombreLignes = statsValides.length;
  const contexte: ContexteTournoi = {
    moyennePts: nombreLignes > 0 ? statsValides.reduce((t, s) => t + s.points, 0) / nombreLignes : 0,
    moyenneFautes: nombreLignes > 0 ? statsValides.reduce((t, s) => t + s.fautes, 0) / nombreLignes : 0,
    moyenneContres: nombreLignes > 0 ? statsValides.reduce((t, s) => t + s.contres, 0) / nombreLignes : 0,
  };

  const coefficients: CoefficientsClassement = {
    k: reglages.coefficientLissage,
    malusFautes: reglages.coefficientMalusFautes,
    boostContres: reglages.coefficientBoostContres,
  };

  const classement = Array.from(agreges.values()).map((joueur) => {
    const info = joueursInfo.get(joueur.joueurId);
    const matchsEquipe = matchsTerminesParEquipe.get(joueur.equipeId) ?? 0;
    return {
      joueurId: joueur.joueurId,
      idKoko: info?.idKoko ?? null,
      nomLegal: info?.nomLegal ?? null,
      prenom: info?.prenom ?? null,
      equipeId: joueur.equipeId,
      totalPts: joueur.totalPts,
      totalFautes: joueur.totalFautes,
      totalContres: joueur.totalContres,
      totalTempsJeu: joueur.totalTempsJeu,
      matchsJoues: joueur.matchsJoues,
      score: calculerScoreClassement(joueur, contexte, reglages.algorithmeClassement, coefficients),
      // Compare au nombre de matchs TERMINE de SA propre equipe, pas au
      // total du tournoi (voir matchsTerminesParEquipe ci-dessus).
      faibleEchantillon: matchsEquipe > 0 && joueur.matchsJoues < matchsEquipe / 2,
    };
  });

  // Tri : score principal (selon l'algorithme) desc, puis temps de jeu
  // desc, puis matchs joues desc — memes departages finaux qu'en V1.
  classement.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.totalTempsJeu !== a.totalTempsJeu) return b.totalTempsJeu - a.totalTempsJeu;
    return b.matchsJoues - a.matchsJoues;
  });

  return classement.map((joueur, index) => ({ rang: index + 1, ...joueur }));
}

// Filtre le classement deja calcule sur un nombre de matchs joues EXACT
// — utile pour comparer entre eux les joueurs qui ont vraiment le meme
// echantillon (recruteurs/competiteurs serieux), sans les melanger avec
// ceux qui ont a peine joue. Re-numerote le rang 1..N a l'interieur de
// ce sous-groupe (le rang global n'a plus de sens une fois filtre).
export function filtrerParMatchsJoues(classement: JoueurClasse[], matchsJoues: number): JoueurClasse[] {
  return classement
    .filter((joueur) => joueur.matchsJoues === matchsJoues)
    .map((joueur, index) => ({ ...joueur, rang: index + 1 }));
}

export interface EquipeClassee {
  rang: number;
  id: number;
  nom: string;
  couleur: string;
  victoires: number;
  defaites: number;
  points: number;
}

// GET .../classement-equipes — victoires/defaites sur les matchs
// REELLEMENT TERMINE, 2 points par victoire (pas d'egalite possible).
export function calculerClassementEquipes(
  matches: MatchPourClassement[],
  equipes: EquipeInfo[]
): EquipeClassee[] {
  const matchsTermines = matches.filter((m) => calculerStatutMatch(m) === "TERMINE");

  const classement = equipes.map((equipe) => {
    let victoires = 0;
    let defaites = 0;

    for (const match of matchsTermines) {
      const estEquipe1 = match.equipe1Id === equipe.id;
      const estEquipe2 = match.equipe2Id === equipe.id;
      if (!estEquipe1 && !estEquipe2) continue;

      const scoreEquipe = estEquipe1 ? match.score1! : match.score2!;
      const scoreAdverse = estEquipe1 ? match.score2! : match.score1!;

      if (scoreEquipe > scoreAdverse) victoires += 1;
      else if (scoreEquipe < scoreAdverse) defaites += 1;
    }

    return { id: equipe.id, nom: equipe.nom, couleur: equipe.couleur, victoires, defaites, points: victoires * 2 };
  });

  classement.sort((a, b) => b.points - a.points || b.victoires - a.victoires);

  return classement.map((equipe, index) => ({ rang: index + 1, ...equipe }));
}
