// ================================================
// TOURNOI CONTROLLER
// ================================================
import { Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { AuthRequest } from "../middlewares/verifierAuth";
import {
  creerTournoiSchema,
  modifierTournoiSchema,
  assignerJoueurSchema,
} from "../utils/validation/tournoiValidator";
import { reponseSucces, reponseErreur } from "../utils/reponses";
import { calculerStatutTournoi, estTournoiModifiable } from "../utils/tournoiStatut";

function enrichir<T extends { statut: string; dateDebut: Date; dateFin: Date }>(tournoi: T) {
  return { ...tournoi, statut: calculerStatutTournoi(tournoi) };
}

// GET /tournois — ADMIN seulement. Filtres : ?statut=, ?organisateurId=
export async function getTournois(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const where: any = {};
    if (req.query.organisateurId) {
      where.organisateurId = parseInt(String(req.query.organisateurId), 10);
    }

    const tournois = await prisma.tournoi.findMany({
      where,
      include: {
        organisateur: { select: { id: true, nom: true, prenom: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    let enrichis = tournois.map(enrichir);
    if (req.query.statut) {
      enrichis = enrichis.filter((t) => t.statut === req.query.statut);
    }

    return reponseSucces(res, enrichis);
  } catch (err) {
    next(err);
  }
}

// GET /tournois/mes-tournois — ORGANISATEUR seulement, scope automatique
// sur ses propres tournois. Filtre : ?statut= (sert notamment a
// consulter l'historique avec ?statut=TERMINE).
export async function getMesTournois(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tournois = await prisma.tournoi.findMany({
      where: { organisateurId: req.user!.userId },
      orderBy: { createdAt: "desc" },
    });

    // Un tournoi ANNULE n'apparait JAMAIS ici, quel que soit le filtre
    // demande — l'organisateur ne doit meme pas savoir qu'il a existe.
    let enrichis = tournois.map(enrichir).filter((t) => t.statut !== "ANNULE");
    if (req.query.statut) {
      enrichis = enrichis.filter((t) => t.statut === req.query.statut);
    }

    return reponseSucces(res, enrichis);
  } catch (err) {
    next(err);
  }
}

// GET /tournois/:id — ADMIN (tout tournoi) ou ORGANISATEUR proprietaire
// (jamais un tournoi ANNULE). Meme reponse (404 generique) que le
// tournoi n'existe pas, n'appartienne pas a l'appelant, ou soit annule
// — aucune des trois raisons n'est jamais revelee.
export async function getTournoiById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(String(req.params.id), 10);
    const tournoi = await prisma.tournoi.findUnique({
      where: { id },
      include: {
        organisateur: { select: { id: true, nom: true, prenom: true } },
        equipes: true,
      },
    });

    if (!tournoi) return reponseErreur(res, "Tournoi introuvable", 404);

    const enrichi = enrichir(tournoi);

    if (req.user!.role === "ADMIN") {
      return reponseSucces(res, enrichi);
    }

    const estProprietaire = tournoi.organisateurId === req.user!.userId;
    if (!estProprietaire || enrichi.statut === "ANNULE") {
      return reponseErreur(res, "Tournoi introuvable", 404);
    }

    return reponseSucces(res, enrichi);
  } catch (err) {
    next(err);
  }
}

// POST /tournois — ADMIN seulement, le geste qui suit la verification de
// paiement (hors app).
export async function creerTournoi(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = creerTournoiSchema.parse(req.body);

    const organisateur = await prisma.user.findUnique({ where: { id: data.organisateurId } });
    if (!organisateur || organisateur.role !== "ORGANISATEUR") {
      return reponseErreur(res, "L'utilisateur selectionne n'est pas un organisateur", 400);
    }

    // Chevauchement de dates : un organisateur ne peut pas avoir deux
    // tournois actifs sur la meme periode. Un tournoi ANNULE ne compte
    // pas — il ne bloque jamais une nouvelle reservation.
    const chevauchement = await prisma.tournoi.findFirst({
      where: {
        organisateurId: data.organisateurId,
        statut: { not: "ANNULE" },
        dateDebut: { lte: data.dateFin },
        dateFin: { gte: data.dateDebut },
      },
    });
    if (chevauchement) {
      return reponseErreur(res, "Cet organisateur a deja un tournoi sur cette periode", 400);
    }

    const tournoi = await prisma.tournoi.create({
      data: {
        nom: data.nom,
        lieu: data.lieu,
        description: data.description,
        dateDebut: data.dateDebut,
        dateFin: data.dateFin,
        organisateurId: data.organisateurId,
        licencesMax: data.licencesMax,
        equipesMax: data.equipesMax,
      },
    });

    return reponseSucces(res, enrichir(tournoi), 201);
  } catch (err) {
    next(err);
  }
}

// PUT /tournois/:id — ORGANISATEUR proprietaire (nom/lieu/description
// seulement) OU ADMIN (tout, y compris les dates, sans restriction de
// statut). Les dates restent HORS DE PORTEE de l'organisateur : les
// laisser modifiables lui permettrait de prolonger indefiniment un
// tournoi deja paye une fois, sans jamais repayer pour une nouvelle
// periode — exactement le contournement qu'on a identifie ensemble.
export async function modifierTournoi(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(String(req.params.id), 10);
    const tournoi = await prisma.tournoi.findUnique({ where: { id } });
    if (!tournoi) return reponseErreur(res, "Tournoi introuvable", 404);

    const estAdmin = req.user!.role === "ADMIN";
    const statutActuel = calculerStatutTournoi(tournoi);

    if (!estAdmin) {
      const estProprietaire = tournoi.organisateurId === req.user!.userId;
      if (!estProprietaire || statutActuel === "ANNULE") {
        return reponseErreur(res, "Tournoi introuvable", 404);
      }
      if (!estTournoiModifiable(statutActuel)) {
        return reponseErreur(res, "Ce tournoi est termine, aucune modification possible", 403);
      }
    }

    const data = modifierTournoiSchema.parse(req.body);

    // Dates ET licences/equipesMax sont hors de portee de l'organisateur —
    // meme raisonnement pour les trois : ce sont des leviers directement
    // lies a ce qui a ete paye hors app, jamais a l'organisateur de se les
    // accorder lui-meme.
    const champsReservesAdmin =
      data.dateDebut !== undefined ||
      data.dateFin !== undefined ||
      data.licencesMax !== undefined ||
      data.equipesMax !== undefined ||
      data.algorithmeClassement !== undefined ||
      data.coefficientLissage !== undefined ||
      data.coefficientMalusFautes !== undefined ||
      data.coefficientBoostContres !== undefined;
    if (!estAdmin && champsReservesAdmin) {
      return reponseErreur(
        res,
        "Seul l'administrateur peut modifier les dates, les licences ou le classement d'un tournoi",
        403
      );
    }

    // Si une seule des deux dates change, Zod n'a pas vu l'autre — on
    // verifie ici la combinaison FINALE (nouvelle valeur ou ancienne,
    // fusionnee) avant d'ecrire quoi que ce soit.
    const dateDebutFinale = data.dateDebut ?? tournoi.dateDebut;
    const dateFinFinale = data.dateFin ?? tournoi.dateFin;
    if (dateFinFinale < dateDebutFinale) {
      return reponseErreur(
        res,
        "La date de fin doit etre posterieure ou egale a la date de debut",
        400
      );
    }

    const misAJour = await prisma.tournoi.update({ where: { id }, data });

    return reponseSucces(res, enrichir(misAJour));
  } catch (err) {
    next(err);
  }
}

// PUT /tournois/:id/annuler — ADMIN seulement.
export async function annulerTournoi(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(String(req.params.id), 10);
    const tournoi = await prisma.tournoi.findUnique({ where: { id } });
    if (!tournoi) return reponseErreur(res, "Tournoi introuvable", 404);

    const misAJour = await prisma.tournoi.update({
      where: { id },
      data: { statut: "ANNULE" },
    });

    return reponseSucces(res, enrichir(misAJour));
  } catch (err) {
    next(err);
  }
}

// PUT /tournois/:id/reactiver — ADMIN seulement. Symetrique de
// annulerTournoi, meme principe que desactiverCompte/reactiverCompte :
// ANNULE n'est "definitif" que dans le sens ou rien ne le recalcule
// jamais tout seul depuis les dates — pas dans le sens ou personne ne
// peut jamais revenir en arriere. Repose le statut a A_VENIR : la
// prochaine lecture recalculera alors la vraie valeur depuis les dates
// (qui peut tres bien redonner TERMINE si les dates sont deja passees).
export async function reactiverTournoi(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(String(req.params.id), 10);
    const tournoi = await prisma.tournoi.findUnique({ where: { id } });
    if (!tournoi) return reponseErreur(res, "Tournoi introuvable", 404);

    const misAJour = await prisma.tournoi.update({
      where: { id },
      data: { statut: "A_VENIR" },
    });

    return reponseSucces(res, enrichir(misAJour));
  } catch (err) {
    next(err);
  }
}

// POST /tournois/:id/joueurs — ADMIN seulement. Assigne un joueur (par
// idKoko) au pool de licences d'un tournoi. C'est le SEUL endroit ou un
// idKoko est cherche a partir d'une saisie libre — reserve a l'ADMIN,
// le seul role pour qui l'existence d'un idKoko n'est jamais un secret
// (il a deja acces a la liste complete via GET /comptes).
export async function assignerJoueur(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tournoiId = parseInt(String(req.params.id), 10);
    const tournoi = await prisma.tournoi.findUnique({ where: { id: tournoiId } });
    if (!tournoi) return reponseErreur(res, "Tournoi introuvable", 404);

    const data = assignerJoueurSchema.parse(req.body);
    const joueur = await prisma.joueur.findUnique({ where: { idKoko: data.idKoko } });
    if (!joueur) return reponseErreur(res, "Joueur introuvable", 404);

    const dejaAssignes = await prisma.tournoiJoueur.count({ where: { tournoiId } });
    if (dejaAssignes >= tournoi.licencesMax) {
      return reponseErreur(res, "Limite de licences atteinte pour ce tournoi", 400);
    }

    try {
      const assignation = await prisma.tournoiJoueur.create({
        data: { tournoiId, joueurId: joueur.id },
      });
      return reponseSucces(res, assignation, 201);
    } catch (err: any) {
      if (err.code === "P2002") {
        return reponseErreur(res, "Ce joueur est deja assigne a ce tournoi", 400);
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

// DELETE /tournois/:id/joueurs/:joueurId — ADMIN seulement. Refuse tant
// que le joueur est encore dans une equipe de ce tournoi : forcer un
// retrait explicite de l'equipe d'abord evite un joueur "fantome"
// (present dans une equipe mais plus dans le pool qui l'autorisait).
export async function desassignerJoueur(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tournoiId = parseInt(String(req.params.id), 10);
    const joueurId = parseInt(String(req.params.joueurId), 10);

    const dansUneEquipe = await prisma.equipeJoueur.findFirst({
      where: { tournoiId, joueurId },
    });
    if (dansUneEquipe) {
      return reponseErreur(
        res,
        "Retirez d'abord ce joueur de son equipe avant de le desassigner du tournoi",
        400
      );
    }

    const suppression = await prisma.tournoiJoueur.deleteMany({
      where: { tournoiId, joueurId },
    });
    if (suppression.count === 0) {
      return reponseErreur(res, "Joueur introuvable dans ce pool", 404);
    }

    return reponseSucces(res, { message: "Joueur desassigne du tournoi" });
  } catch (err) {
    next(err);
  }
}

// GET /tournois/:id/joueurs — ADMIN (tout tournoi) ou proprietaire
// organisateur. Renvoie le pool assigne, avec l'equipe courante du
// joueur si deja placee — c'est LA liste dans laquelle l'organisateur
// choisit, jamais une recherche libre.
export async function getJoueursDisponibles(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tournoiId = parseInt(String(req.params.id), 10);
    const tournoi = await prisma.tournoi.findUnique({ where: { id: tournoiId } });
    if (!tournoi) return reponseErreur(res, "Tournoi introuvable", 404);

    if (req.user!.role !== "ADMIN" && tournoi.organisateurId !== req.user!.userId) {
      return reponseErreur(res, "Tournoi introuvable", 404);
    }

    const pool = await prisma.tournoiJoueur.findMany({
      where: { tournoiId },
      include: {
        joueur: { select: { id: true, idKoko: true, nomLegal: true, prenom: true } },
      },
    });

    const assignations = await prisma.equipeJoueur.findMany({
      where: { tournoiId },
      select: { joueurId: true, equipeId: true },
    });
    const equipeParJoueur = new Map(assignations.map((a) => [a.joueurId, a.equipeId]));

    const resultat = pool.map((p) => ({
      ...p.joueur,
      equipeId: equipeParJoueur.get(p.joueur.id) ?? null,
    }));

    return reponseSucces(res, resultat);
  } catch (err) {
    next(err);
  }
}
