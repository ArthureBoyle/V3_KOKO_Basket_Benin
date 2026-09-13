// ================================================
// TESTS UNITAIRES — classement (fonctions pures, aucune DB)
// ================================================
import { describe, it, expect } from "vitest";
import {
  calculerScoreClassement,
  calculerClassementJoueurs,
  calculerClassementEquipes,
  filtrerParMatchsJoues,
  MatchPourClassement,
  StatPourClassement,
  JoueurInfo,
  EquipeInfo,
} from "../../src/utils/classement";

// Chiffres repris/verifies a la main pendant la discussion avec
// l'utilisateur (k=3, malusFautes=0.6, boostContres=0.6).
describe("calculerScoreClassement", () => {
  const joueur = { totalPts: 160, totalFautes: 8, totalContres: 24, matchsJoues: 8 };
  const contexte = { moyennePts: 15, moyenneFautes: 2, moyenneContres: 1.5 };
  const coefficients = { k: 3, malusFautes: 0.6, boostContres: 0.6 };

  it("POINTS_BRUTS -> le total brut, sans aucun ajustement", () => {
    const score = calculerScoreClassement(joueur, contexte, "POINTS_BRUTS", coefficients);
    expect(score).toBe(160);
  });

  it("POINTS_PONDERES -> moyenne bayesienne sur les points seuls", () => {
    const score = calculerScoreClassement(joueur, contexte, "POINTS_PONDERES", coefficients);
    // (160 + 3*15) / (8+3) = 205/11
    expect(score).toBeCloseTo(18.636, 2);
  });

  it("POINTS_PONDERES_FAUTES -> retranche le malus lisse", () => {
    const score = calculerScoreClassement(joueur, contexte, "POINTS_PONDERES_FAUTES", coefficients);
    // 18.636 - 0.6*(8+6)/11 = 18.636 - 0.764
    expect(score).toBeCloseTo(17.873, 2);
  });

  it("POINTS_PONDERES_FAUTES_CONTRES -> ajoute le boost lisse", () => {
    const score = calculerScoreClassement(joueur, contexte, "POINTS_PONDERES_FAUTES_CONTRES", coefficients);
    // 17.873 + 0.6*(24+4.5)/11 = 17.873 + 1.555
    expect(score).toBeCloseTo(19.427, 2);
  });
});

describe("calculerClassementJoueurs", () => {
  const matches: MatchPourClassement[] = [
    { id: 1, equipe1Id: 10, equipe2Id: 20, score1: 60, score2: 50, statut: "A_VENIR", date: new Date("2020-01-01") },
    { id: 2, equipe1Id: 10, equipe2Id: 20, score1: 55, score2: 58, statut: "A_VENIR", date: new Date("2020-01-02") },
    { id: 5, equipe1Id: 10, equipe2Id: 20, score1: 70, score2: 60, statut: "A_VENIR", date: new Date("2020-01-05") },
    // ANNULE : doit etre totalement ignore, meme si un score existe.
    { id: 3, equipe1Id: 10, equipe2Id: 20, score1: null, score2: null, statut: "ANNULE", date: new Date("2020-01-03") },
    // Pas encore joue (date future, pas de score) : doit etre ignore.
    { id: 4, equipe1Id: 10, equipe2Id: 20, score1: null, score2: null, statut: "A_VENIR", date: new Date("2099-01-01") },
  ];

  const stats: StatPourClassement[] = [
    { matchId: 1, joueurId: 100, equipeId: 10, points: 20, fautes: 1, contres: 0, tempsJeu: 30 },
    { matchId: 2, joueurId: 100, equipeId: 10, points: 25, fautes: 2, contres: 1, tempsJeu: 32 },
    { matchId: 5, joueurId: 100, equipeId: 10, points: 10, fautes: 0, contres: 0, tempsJeu: 20 },
    { matchId: 1, joueurId: 200, equipeId: 20, points: 15, fautes: 3, contres: 2, tempsJeu: 28 },
    // Rattachee a un match ANNULE : ne doit JAMAIS entrer dans l'agregation.
    { matchId: 3, joueurId: 200, equipeId: 20, points: 100, fautes: 0, contres: 0, tempsJeu: 40 },
    // Rattachee a un match pas encore joue : meme chose.
    { matchId: 4, joueurId: 100, equipeId: 10, points: 999, fautes: 0, contres: 0, tempsJeu: 99 },
  ];

  const joueursInfo = new Map<number, JoueurInfo>([
    [100, { id: 100, idKoko: "KOKO-2026-0001", nomLegal: "Dupont", prenom: "Jean" }],
    [200, { id: 200, idKoko: "KOKO-2026-0002", nomLegal: "Martin", prenom: "Paul" }],
  ]);

  const reglages = {
    algorithmeClassement: "POINTS_PONDERES_FAUTES_CONTRES" as const,
    coefficientLissage: 3,
    coefficientMalusFautes: 0.6,
    coefficientBoostContres: 0.6,
  };

  it("ignore les stats d'un match ANNULE, meme si un score existe dessus", () => {
    const classement = calculerClassementJoueurs(stats, matches, joueursInfo, reglages);
    const joueur200 = classement.find((j) => j.joueurId === 200)!;
    // Si le match 3 (100 pts) etait compte, totalPts serait 115 au lieu de 15.
    expect(joueur200.totalPts).toBe(15);
    expect(joueur200.matchsJoues).toBe(1);
  });

  it("ignore les stats d'un match pas encore joue", () => {
    const classement = calculerClassementJoueurs(stats, matches, joueursInfo, reglages);
    const joueur100 = classement.find((j) => j.joueurId === 100)!;
    // Si le match 4 (999 pts) etait compte, totalPts serait 1054 au lieu de 55.
    expect(joueur100.totalPts).toBe(55);
    expect(joueur100.matchsJoues).toBe(3);
  });

  it("classe joueur 100 devant joueur 200 (score pondere final)", () => {
    const classement = calculerClassementJoueurs(stats, matches, joueursInfo, reglages);
    expect(classement[0].joueurId).toBe(100);
    expect(classement[0].rang).toBe(1);
    expect(classement[1].joueurId).toBe(200);
    expect(classement[1].rang).toBe(2);
    expect(classement[0].score).toBeCloseTo(17.49, 1);
    expect(classement[1].score).toBeCloseTo(16.39, 1);
  });

  it("signale faibleEchantillon pour le joueur qui a joue moins de la moitie des matchs termines", () => {
    const classement = calculerClassementJoueurs(stats, matches, joueursInfo, reglages);
    const joueur100 = classement.find((j) => j.joueurId === 100)!;
    const joueur200 = classement.find((j) => j.joueurId === 200)!;
    // 3 matchs TERMINE au total (1, 2, 5) -> seuil = 1.5
    expect(joueur100.matchsJoues).toBe(3);
    expect(joueur100.faibleEchantillon).toBe(false);
    expect(joueur200.matchsJoues).toBe(1);
    expect(joueur200.faibleEchantillon).toBe(true);
  });

  it("faibleEchantillon compare au nombre de matchs de SA propre equipe, pas au total du tournoi", () => {
    // Equipe 30 n'a joue qu'UN SEUL match (m4), alors que le tournoi en
    // compte 4 au total (1, 2, 5 entre 10/20, plus m4 entre 10/30).
    // Un joueur de l'equipe 30 qui a joue ce seul match a joue 100% des
    // matchs de SON equipe -- il ne doit PAS etre flague faibleEchantillon,
    // meme si 1 < 4/2 (l'ancien calcul, errone, l'aurait flague).
    const matchesAvecEquipe30: MatchPourClassement[] = [
      ...matches,
      { id: 6, equipe1Id: 10, equipe2Id: 30, score1: 40, score2: 35, statut: "A_VENIR", date: new Date("2020-01-06") },
    ];
    const statsAvecEquipe30: StatPourClassement[] = [
      ...stats,
      { matchId: 6, joueurId: 300, equipeId: 30, points: 12, fautes: 1, contres: 0, tempsJeu: 25 },
    ];
    const joueursInfoAvecEquipe30 = new Map(joueursInfo);
    joueursInfoAvecEquipe30.set(300, { id: 300, idKoko: "KOKO-2026-0003", nomLegal: "Durand", prenom: "Luc" });

    const classement = calculerClassementJoueurs(statsAvecEquipe30, matchesAvecEquipe30, joueursInfoAvecEquipe30, reglages);
    const joueur300 = classement.find((j) => j.joueurId === 300)!;

    expect(joueur300.matchsJoues).toBe(1);
    expect(joueur300.faibleEchantillon).toBe(false);
  });

  it("POINTS_BRUTS donne un classement different (pas de lissage)", () => {
    const classement = calculerClassementJoueurs(stats, matches, joueursInfo, {
      ...reglages,
      algorithmeClassement: "POINTS_BRUTS",
    });
    // 55 (joueur 100) > 15 (joueur 200), toujours le meme ordre ici,
    // mais les scores sont les totaux bruts, pas pondere.
    expect(classement[0].score).toBe(55);
    expect(classement[1].score).toBe(15);
  });
});

describe("filtrerParMatchsJoues", () => {
  const matches: MatchPourClassement[] = [
    { id: 1, equipe1Id: 10, equipe2Id: 20, score1: 60, score2: 50, statut: "A_VENIR", date: new Date("2020-01-01") },
    { id: 2, equipe1Id: 10, equipe2Id: 20, score1: 55, score2: 58, statut: "A_VENIR", date: new Date("2020-01-02") },
    { id: 5, equipe1Id: 10, equipe2Id: 20, score1: 70, score2: 60, statut: "A_VENIR", date: new Date("2020-01-05") },
  ];
  const stats: StatPourClassement[] = [
    { matchId: 1, joueurId: 100, equipeId: 10, points: 20, fautes: 1, contres: 0, tempsJeu: 30 },
    { matchId: 2, joueurId: 100, equipeId: 10, points: 25, fautes: 2, contres: 1, tempsJeu: 32 },
    { matchId: 5, joueurId: 100, equipeId: 10, points: 10, fautes: 0, contres: 0, tempsJeu: 20 },
    { matchId: 1, joueurId: 200, equipeId: 20, points: 15, fautes: 3, contres: 2, tempsJeu: 28 },
  ];
  const joueursInfo = new Map<number, JoueurInfo>();
  const reglages = {
    algorithmeClassement: "POINTS_PONDERES_FAUTES_CONTRES" as const,
    coefficientLissage: 3,
    coefficientMalusFautes: 0.6,
    coefficientBoostContres: 0.6,
  };
  const classement = calculerClassementJoueurs(stats, matches, joueursInfo, reglages);

  it("ne garde que les joueurs ayant joue EXACTEMENT ce nombre de matchs", () => {
    const filtre3 = filtrerParMatchsJoues(classement, 3);
    expect(filtre3).toHaveLength(1);
    expect(filtre3[0].joueurId).toBe(100);
    expect(filtre3[0].rang).toBe(1); // re-numerote a l'interieur du sous-groupe

    const filtre1 = filtrerParMatchsJoues(classement, 1);
    expect(filtre1).toHaveLength(1);
    expect(filtre1[0].joueurId).toBe(200);
    expect(filtre1[0].rang).toBe(1);
  });

  it("renvoie un tableau vide si personne n'a joue exactement ce nombre de matchs", () => {
    expect(filtrerParMatchsJoues(classement, 99)).toHaveLength(0);
  });
});

describe("calculerClassementEquipes", () => {
  const equipes: EquipeInfo[] = [
    { id: 10, nom: "Lions", couleur: "#FF0000" },
    { id: 20, nom: "Tigres", couleur: "#0000FF" },
  ];

  const matches: MatchPourClassement[] = [
    { id: 1, equipe1Id: 10, equipe2Id: 20, score1: 60, score2: 50, statut: "A_VENIR", date: new Date("2020-01-01") }, // Lions gagnent
    { id: 2, equipe1Id: 10, equipe2Id: 20, score1: 55, score2: 58, statut: "A_VENIR", date: new Date("2020-01-02") }, // Tigres gagnent
    { id: 5, equipe1Id: 10, equipe2Id: 20, score1: 70, score2: 60, statut: "A_VENIR", date: new Date("2020-01-05") }, // Lions gagnent
    // ANNULE malgre un score qui donnerait un blowout aux Lions -- doit
    // etre totalement ignore.
    { id: 6, equipe1Id: 10, equipe2Id: 20, score1: 99, score2: 0, statut: "ANNULE", date: new Date("2020-01-06") },
  ];

  it("compte victoires/defaites uniquement sur les matchs reellement TERMINE", () => {
    const classement = calculerClassementEquipes(matches, equipes);
    const lions = classement.find((e) => e.id === 10)!;
    const tigres = classement.find((e) => e.id === 20)!;

    expect(lions.victoires).toBe(2);
    expect(lions.defaites).toBe(1);
    expect(tigres.victoires).toBe(1);
    expect(tigres.defaites).toBe(2);
  });

  it("2 points par victoire, classe par points puis victoires", () => {
    const classement = calculerClassementEquipes(matches, equipes);
    expect(classement[0].id).toBe(10);
    expect(classement[0].points).toBe(4);
    expect(classement[0].rang).toBe(1);
    expect(classement[1].id).toBe(20);
    expect(classement[1].points).toBe(2);
    expect(classement[1].rang).toBe(2);
  });
});
