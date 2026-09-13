// ================================================
// STAT CONTROLLER
// ================================================
import { Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { AuthRequest } from "../middlewares/verifierAuth";
import { saisirStatSchema } from "../utils/validation/statValidator";
import { reponseSucces, reponseErreur } from "../utils/reponses";
import { calculerStatutMatch } from "../utils/matchStatut";
import { verifierAccesTournoi } from "../utils/accesTournoi";

// PUT /matchs/:id/stats/:joueurId — saisie initiale ou correction (upsert
// applicatif sur la contrainte unique matchId+joueurId). Le match doit
// deja etre TERMINE (score saisi) : les stats se saisissent APRES le
// resultat, jamais avant ni independamment de lui. Meme plafond de
// corrections que le score (2 max pour l'organisateur, illimite ADMIN).
export async function saisirStat(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const matchId = parseInt(String(req.params.id), 10);
    const joueurId = parseInt(String(req.params.joueurId), 10);

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return reponseErreur(res, "Match introuvable", 404);

    const acces = await verifierAccesTournoi(match.tournoiId, req.user!);
    if (!acces.ok) return reponseErreur(res, "Match introuvable", acces.status);

    const statutCalcule = calculerStatutMatch(match);
    if (statutCalcule !== "TERMINE") {
      return reponseErreur(res, "Le score doit etre saisi avant de saisir les stats", 400);
    }

    const data = saisirStatSchema.parse(req.body);

    // Le joueur DOIT reellement appartenir a L'UNE des deux equipes de
    // CE match precis (via son inscription EquipeJoueur pour ce
    // tournoi), et l'equipeId envoye doit correspondre a sa VRAIE
    // equipe — sinon 404 generique, comme pour le pool de licences.
    if (data.equipeId !== match.equipe1Id && data.equipeId !== match.equipe2Id) {
      return reponseErreur(res, "Joueur introuvable pour ce match", 404);
    }
    const appartenance = await prisma.equipeJoueur.findUnique({
      where: { tournoiId_joueurId: { tournoiId: match.tournoiId, joueurId } },
    });
    if (!appartenance || appartenance.equipeId !== data.equipeId) {
      return reponseErreur(res, "Joueur introuvable pour ce match", 404);
    }

    const statExistante = await prisma.stat.findUnique({
      where: { matchId_joueurId: { matchId, joueurId } },
    });

    if (statExistante && !acces.estAdmin && statExistante.nombreCorrections >= 2) {
      return reponseErreur(
        res,
        "Limite de corrections atteinte pour cette stat, contactez l'administrateur",
        403
      );
    }

    const stat = await prisma.stat.upsert({
      where: { matchId_joueurId: { matchId, joueurId } },
      create: {
        matchId,
        joueurId,
        equipeId: data.equipeId,
        points: data.points,
        fautes: data.fautes,
        contres: data.contres,
        tempsJeu: data.tempsJeu,
      },
      update: {
        points: data.points,
        fautes: data.fautes,
        contres: data.contres,
        tempsJeu: data.tempsJeu,
        // Incremente uniquement sur une CORRECTION (ligne deja
        // existante) faite par l'organisateur — jamais pour l'ADMIN.
        ...(!acces.estAdmin ? { nombreCorrections: { increment: 1 } } : {}),
      },
    });

    return reponseSucces(res, stat, statExistante ? 200 : 201);
  } catch (err) {
    next(err);
  }
}

// GET /matchs/:id/stats — ADMIN ou proprietaire du tournoi parent.
export async function getStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const matchId = parseInt(String(req.params.id), 10);
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return reponseErreur(res, "Match introuvable", 404);

    const acces = await verifierAccesTournoi(match.tournoiId, req.user!);
    if (!acces.ok) return reponseErreur(res, "Match introuvable", acces.status);

    const stats = await prisma.stat.findMany({
      where: { matchId },
      include: {
        joueur: { select: { id: true, idKoko: true, nomLegal: true, prenom: true } },
      },
    });

    return reponseSucces(res, stats);
  } catch (err) {
    next(err);
  }
}

// DELETE /matchs/:id/stats/:joueurId — ADMIN seulement (nettoyage d'une
// saisie erronee sans consommer/contourner le plafond de corrections).
export async function supprimerStat(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const matchId = parseInt(String(req.params.id), 10);
    const joueurId = parseInt(String(req.params.joueurId), 10);

    const suppression = await prisma.stat.deleteMany({ where: { matchId, joueurId } });
    if (suppression.count === 0) {
      return reponseErreur(res, "Stat introuvable", 404);
    }

    return reponseSucces(res, { message: "Stat supprimee" });
  } catch (err) {
    next(err);
  }
}
