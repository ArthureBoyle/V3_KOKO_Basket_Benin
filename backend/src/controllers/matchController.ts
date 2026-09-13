// ================================================
// MATCH CONTROLLER
// ================================================
import { Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { AuthRequest } from "../middlewares/verifierAuth";
import {
  creerMatchSchema,
  modifierMatchSchema,
  saisirScoreSchema,
  reprogrammerMatchSchema,
} from "../utils/validation/matchValidator";
import { reponseSucces, reponseErreur } from "../utils/reponses";
import { estTournoiModifiable } from "../utils/tournoiStatut";
import { calculerStatutMatch, estMatchModifiable } from "../utils/matchStatut";
import { verifierAccesTournoi } from "../utils/accesTournoi";

function enrichirMatch<
  T extends { statut: string; date: Date; score1: number | null; score2: number | null }
>(match: T) {
  return { ...match, statut: calculerStatutMatch(match) };
}

// POST /matchs — ORGANISATEUR proprietaire (ou ADMIN). equipe1Id/equipe2Id
// doivent appartenir au tournoi et etre distinctes.
export async function creerMatch(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = creerMatchSchema.parse(req.body);
    const acces = await verifierAccesTournoi(data.tournoiId, req.user!);
    if (!acces.ok) return reponseErreur(res, acces.message, acces.status);
    if (!acces.estAdmin && !estTournoiModifiable(acces.statutCalcule)) {
      return reponseErreur(res, "Ce tournoi est termine, aucun match ne peut y etre cree", 403);
    }

    const [equipe1, equipe2] = await Promise.all([
      prisma.equipe.findUnique({ where: { id: data.equipe1Id } }),
      prisma.equipe.findUnique({ where: { id: data.equipe2Id } }),
    ]);
    if (!equipe1 || equipe1.tournoiId !== data.tournoiId) {
      return reponseErreur(res, "equipe1Id invalide pour ce tournoi", 400);
    }
    if (!equipe2 || equipe2.tournoiId !== data.tournoiId) {
      return reponseErreur(res, "equipe2Id invalide pour ce tournoi", 400);
    }

    const match = await prisma.match.create({
      data: {
        tournoiId: data.tournoiId,
        equipe1Id: data.equipe1Id,
        equipe2Id: data.equipe2Id,
        date: data.date,
        lieu: data.lieu,
        type: data.type,
        arbitre: data.arbitre,
      },
    });

    return reponseSucces(res, enrichirMatch(match), 201);
  } catch (err) {
    next(err);
  }
}

// GET /matchs?tournoiId=&statut= — ADMIN (tout, filtrable) ou
// ORGANISATEUR (tournoiId obligatoire, doit lui appartenir).
export async function getMatchs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const estAdmin = req.user!.role === "ADMIN";
    let tournoiId: number | undefined;

    if (!estAdmin) {
      if (!req.query.tournoiId) {
        return reponseErreur(res, "tournoiId requis", 400);
      }
      tournoiId = parseInt(String(req.query.tournoiId), 10);
      const acces = await verifierAccesTournoi(tournoiId, req.user!);
      if (!acces.ok) return reponseErreur(res, acces.message, acces.status);
    } else if (req.query.tournoiId) {
      tournoiId = parseInt(String(req.query.tournoiId), 10);
    }

    const where: any = {};
    if (tournoiId !== undefined) where.tournoiId = tournoiId;

    const matchs = await prisma.match.findMany({ where, orderBy: { date: "asc" } });
    let enrichis = matchs.map(enrichirMatch);
    if (req.query.statut) {
      enrichis = enrichis.filter((m) => m.statut === req.query.statut);
    }

    return reponseSucces(res, enrichis);
  } catch (err) {
    next(err);
  }
}

// GET /matchs/:id — ADMIN ou proprietaire du tournoi parent.
export async function getMatchById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(String(req.params.id), 10);
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        equipe1: { select: { id: true, nom: true, couleur: true } },
        equipe2: { select: { id: true, nom: true, couleur: true } },
      },
    });
    if (!match) return reponseErreur(res, "Match introuvable", 404);

    const acces = await verifierAccesTournoi(match.tournoiId, req.user!);
    if (!acces.ok) return reponseErreur(res, "Match introuvable", acces.status);

    return reponseSucces(res, enrichirMatch(match));
  } catch (err) {
    next(err);
  }
}

// PUT /matchs/:id — lieu/type/arbitre seulement. La date passe
// exclusivement par reporterMatch/reprogrammerMatch.
export async function modifierMatch(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(String(req.params.id), 10);
    const match = await prisma.match.findUnique({ where: { id } });
    if (!match) return reponseErreur(res, "Match introuvable", 404);

    const acces = await verifierAccesTournoi(match.tournoiId, req.user!);
    if (!acces.ok) return reponseErreur(res, "Match introuvable", acces.status);

    const statutCalcule = calculerStatutMatch(match);
    if (!acces.estAdmin && !estMatchModifiable(statutCalcule)) {
      return reponseErreur(res, "Ce match ne peut plus etre modifie", 403);
    }

    const data = modifierMatchSchema.parse(req.body);
    const misAJour = await prisma.match.update({ where: { id }, data });

    return reponseSucces(res, enrichirMatch(misAJour));
  } catch (err) {
    next(err);
  }
}

// PUT /matchs/:id/score — saisie initiale libre ; correction plafonnee a
// 2 pour l'ORGANISATEUR (1 saisie + 2 corrections = 3 au total),
// illimitee pour l'ADMIN (ne consomme jamais le compteur).
export async function saisirScore(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(String(req.params.id), 10);
    const match = await prisma.match.findUnique({ where: { id } });
    if (!match) return reponseErreur(res, "Match introuvable", 404);

    const acces = await verifierAccesTournoi(match.tournoiId, req.user!);
    if (!acces.ok) return reponseErreur(res, "Match introuvable", acces.status);

    const statutCalcule = calculerStatutMatch(match);
    if (statutCalcule === "ANNULE" || statutCalcule === "REPORTE") {
      return reponseErreur(
        res,
        "Impossible de saisir un score pour un match annule ou en attente de reprogrammation",
        400
      );
    }

    const data = saisirScoreSchema.parse(req.body);
    const dejaSaisi = match.score1 !== null && match.score2 !== null;

    if (dejaSaisi && !acces.estAdmin && match.nombreCorrectionsScore >= 2) {
      return reponseErreur(
        res,
        "Limite de corrections atteinte pour ce match, contactez l'administrateur",
        403
      );
    }

    const misAJour = await prisma.match.update({
      where: { id },
      data: {
        score1: data.score1,
        score2: data.score2,
        // Incremente uniquement sur une CORRECTION (score deja present
        // avant cet appel) faite par l'organisateur — jamais sur la
        // saisie initiale, jamais pour l'ADMIN.
        ...(dejaSaisi && !acces.estAdmin ? { nombreCorrectionsScore: { increment: 1 } } : {}),
      },
    });

    return reponseSucces(res, enrichirMatch(misAJour));
  } catch (err) {
    next(err);
  }
}

// PUT /matchs/:id/annuler — ORGANISATEUR proprietaire ou ADMIN.
export async function annulerMatch(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(String(req.params.id), 10);
    const match = await prisma.match.findUnique({ where: { id } });
    if (!match) return reponseErreur(res, "Match introuvable", 404);

    const acces = await verifierAccesTournoi(match.tournoiId, req.user!);
    if (!acces.ok) return reponseErreur(res, "Match introuvable", acces.status);

    const misAJour = await prisma.match.update({ where: { id }, data: { statut: "ANNULE" } });
    return reponseSucces(res, enrichirMatch(misAJour));
  } catch (err) {
    next(err);
  }
}

// PUT /matchs/:id/reactiver — symetrique de annulerMatch. Repose le
// statut a A_VENIR : la prochaine lecture recalcule la vraie valeur
// (peut redonner EN_RETARD si la date est deja passee).
export async function reactiverMatch(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(String(req.params.id), 10);
    const match = await prisma.match.findUnique({ where: { id } });
    if (!match) return reponseErreur(res, "Match introuvable", 404);

    const acces = await verifierAccesTournoi(match.tournoiId, req.user!);
    if (!acces.ok) return reponseErreur(res, "Match introuvable", acces.status);

    // Garde indispensable : sans elle, appeler /reactiver sur un match
    // REPORTE l'aurait silencieusement fait sortir de cet etat sans
    // jamais passer par reprogrammerMatch (donc sans jamais forcer une
    // nouvelle date) — /reactiver est reserve a l'antidote de ANNULE.
    if (match.statut !== "ANNULE") {
      return reponseErreur(res, "Ce match n'est pas annule", 400);
    }

    const misAJour = await prisma.match.update({ where: { id }, data: { statut: "A_VENIR" } });
    return reponseSucces(res, enrichirMatch(misAJour));
  } catch (err) {
    next(err);
  }
}

// PUT /matchs/:id/reporter — passe en REPORTE SANS nouvelle date (etat
// bloquant separe, voir reprogrammerMatch). Garde la toute PREMIERE date
// d'origine si le match est reporte plusieurs fois de suite.
export async function reporterMatch(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(String(req.params.id), 10);
    const match = await prisma.match.findUnique({ where: { id } });
    if (!match) return reponseErreur(res, "Match introuvable", 404);

    const acces = await verifierAccesTournoi(match.tournoiId, req.user!);
    if (!acces.ok) return reponseErreur(res, "Match introuvable", acces.status);

    const statutCalcule = calculerStatutMatch(match);
    if (statutCalcule === "ANNULE") {
      return reponseErreur(res, "Un match annule ne peut pas etre reporte", 400);
    }
    if (statutCalcule === "TERMINE") {
      return reponseErreur(res, "Un match deja termine ne peut pas etre reporte", 400);
    }
    if (statutCalcule === "REPORTE") {
      return reponseErreur(res, "Ce match est deja en attente de reprogrammation", 400);
    }

    const misAJour = await prisma.match.update({
      where: { id },
      data: {
        statut: "REPORTE",
        dateOriginale: match.dateOriginale ?? match.date,
      },
    });

    return reponseSucces(res, enrichirMatch(misAJour));
  } catch (err) {
    next(err);
  }
}

// PUT /matchs/:id/reprogrammer — fixe la nouvelle date, sort de REPORTE.
export async function reprogrammerMatch(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(String(req.params.id), 10);
    const match = await prisma.match.findUnique({ where: { id } });
    if (!match) return reponseErreur(res, "Match introuvable", 404);

    const acces = await verifierAccesTournoi(match.tournoiId, req.user!);
    if (!acces.ok) return reponseErreur(res, "Match introuvable", acces.status);

    const statutCalcule = calculerStatutMatch(match);
    if (statutCalcule !== "REPORTE") {
      return reponseErreur(res, "Ce match n'est pas en attente de reprogrammation", 400);
    }

    const data = reprogrammerMatchSchema.parse(req.body);
    const misAJour = await prisma.match.update({
      where: { id },
      data: { date: data.nouvelleDate, statut: "A_VENIR" },
    });

    return reponseSucces(res, enrichirMatch(misAJour));
  } catch (err) {
    next(err);
  }
}
