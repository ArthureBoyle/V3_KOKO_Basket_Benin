// ================================================
// CLASSEMENT CONTROLLER — fetch Prisma + appel des fonctions pures
// de utils/classement.ts (aucune logique de calcul ici).
// ================================================
import { Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { AuthRequest } from "../middlewares/verifierAuth";
import { reponseSucces, reponseErreur } from "../utils/reponses";
import { verifierAccesLectureClassement } from "../utils/accesTournoi";
import {
  calculerClassementJoueurs,
  calculerClassementEquipes,
  filtrerParMatchsJoues,
  JoueurInfo,
} from "../utils/classement";

// GET /tournois/:id/classement — classement joueurs, selon l'algorithme
// et les coefficients regles par l'ADMIN pour ce tournoi.
export async function getClassementJoueurs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tournoiId = parseInt(String(req.params.id), 10);
    const acces = await verifierAccesLectureClassement(tournoiId, req.user!);
    if (!acces.ok) return reponseErreur(res, acces.message, acces.status);

    const [matches, statsBrutes, pool] = await Promise.all([
      prisma.match.findMany({ where: { tournoiId } }),
      prisma.stat.findMany({ where: { match: { tournoiId } } }),
      prisma.tournoiJoueur.findMany({ where: { tournoiId }, select: { joueurId: true } }),
    ]);

    // Seuls les joueurs ENCORE certifies (presents dans le pool) sont
    // classes. Les stats d'un joueur retire du tournoi restent en base,
    // mais ne sont ni affichees ni prises dans la moyenne du tournoi qui
    // sert au lissage bayesien.
    const certifies = new Set(pool.map((p) => p.joueurId));
    const stats = statsBrutes.filter((s) => certifies.has(s.joueurId));

    const joueurIds = Array.from(new Set(stats.map((s) => s.joueurId)));
    const joueurs = await prisma.joueur.findMany({
      where: { id: { in: joueurIds } },
      select: { id: true, idKoko: true, nomLegal: true, prenom: true },
    });
    const joueursInfo = new Map<number, JoueurInfo>(joueurs.map((j) => [j.id, j]));

    const classement = calculerClassementJoueurs(stats, matches, joueursInfo, {
      algorithmeClassement: acces.tournoi.algorithmeClassement,
      coefficientLissage: acces.tournoi.coefficientLissage,
      coefficientMalusFautes: acces.tournoi.coefficientMalusFautes,
      coefficientBoostContres: acces.tournoi.coefficientBoostContres,
    });

    // ?matchsJoues=N — ne compare entre eux QUE les joueurs ayant joue
    // exactement ce nombre de matchs (recruteurs/competiteurs serieux
    // qui veulent un echantillon comparable, sans les melanger avec des
    // joueurs qui ont a peine joue).
    if (req.query.matchsJoues !== undefined) {
      const n = parseInt(String(req.query.matchsJoues), 10);
      return reponseSucces(res, filtrerParMatchsJoues(classement, n));
    }

    return reponseSucces(res, classement);
  } catch (err) {
    next(err);
  }
}

// GET /tournois/:id/classement-equipes — victoires/defaites, aucune
// Stat necessaire (fonctionne meme si l'organisateur n'a jamais saisi
// de stats detaillees).
export async function getClassementEquipes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tournoiId = parseInt(String(req.params.id), 10);
    const acces = await verifierAccesLectureClassement(tournoiId, req.user!);
    if (!acces.ok) return reponseErreur(res, acces.message, acces.status);

    const matches = await prisma.match.findMany({ where: { tournoiId } });
    const equipes = await prisma.equipe.findMany({
      where: { tournoiId },
      select: { id: true, nom: true, couleur: true },
    });

    const classement = calculerClassementEquipes(matches, equipes);
    return reponseSucces(res, classement);
  } catch (err) {
    next(err);
  }
}
