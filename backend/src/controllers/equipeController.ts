// ================================================
// EQUIPE CONTROLLER
// ================================================
import { Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { AuthRequest } from "../middlewares/verifierAuth";
import {
  creerEquipeSchema,
  ajouterJoueurSchema,
  changerStatutJoueurSchema,
} from "../utils/validation/equipeValidator";
import { reponseSucces, reponseErreur } from "../utils/reponses";
import { estTournoiModifiable } from "../utils/tournoiStatut";
import { verifierAccesTournoi } from "../utils/accesTournoi";
import { traiterEtEnregistrerImage, supprimerAncienneImage } from "../utils/uploadImage";

// POST /equipes — ORGANISATEUR proprietaire (ou ADMIN), dans la limite
// de equipesMax fixee par l'ADMIN pour ce tournoi.
export async function creerEquipe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = creerEquipeSchema.parse(req.body);
    const acces = await verifierAccesTournoi(data.tournoiId, req.user!);
    if (!acces.ok) return reponseErreur(res, acces.message, acces.status);
    if (!acces.estAdmin && !estTournoiModifiable(acces.statutCalcule)) {
      return reponseErreur(res, "Ce tournoi est termine, aucune equipe ne peut y etre creee", 403);
    }

    const nombreEquipes = await prisma.equipe.count({ where: { tournoiId: data.tournoiId } });
    if (nombreEquipes >= acces.tournoi.equipesMax) {
      return reponseErreur(res, "Nombre maximal d'equipes atteint pour ce tournoi", 400);
    }

    const equipe = await prisma.equipe.create({
      data: {
        nom: data.nom,
        couleur: data.couleur,
        logo: data.logo,
        tournoiId: data.tournoiId,
      },
    });

    return reponseSucces(res, equipe, 201);
  } catch (err) {
    next(err);
  }
}

// GET /equipes?tournoiId= — ADMIN (tout, filtrable) ou ORGANISATEUR
// (tournoiId obligatoire, doit lui appartenir).
export async function getEquipes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const estAdmin = req.user!.role === "ADMIN";

    if (!estAdmin) {
      if (!req.query.tournoiId) {
        return reponseErreur(res, "tournoiId requis", 400);
      }
      const tournoiId = parseInt(String(req.query.tournoiId), 10);
      const acces = await verifierAccesTournoi(tournoiId, req.user!);
      if (!acces.ok) return reponseErreur(res, acces.message, acces.status);

      const equipes = await prisma.equipe.findMany({ where: { tournoiId } });
      return reponseSucces(res, equipes);
    }

    const where: any = {};
    if (req.query.tournoiId) {
      where.tournoiId = parseInt(String(req.query.tournoiId), 10);
    }
    const equipes = await prisma.equipe.findMany({ where });
    return reponseSucces(res, equipes);
  } catch (err) {
    next(err);
  }
}

// GET /equipes/:id — ADMIN ou proprietaire du tournoi parent.
export async function getEquipeById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(String(req.params.id), 10);
    const equipe = await prisma.equipe.findUnique({
      where: { id },
      include: {
        joueurs: {
          include: { joueur: { select: { id: true, idKoko: true, nomLegal: true, prenom: true } } },
        },
      },
    });
    if (!equipe) return reponseErreur(res, "Equipe introuvable", 404);

    const acces = await verifierAccesTournoi(equipe.tournoiId, req.user!);
    if (!acces.ok) return reponseErreur(res, "Equipe introuvable", acces.status);

    return reponseSucces(res, equipe);
  } catch (err) {
    next(err);
  }
}

// POST /equipes/:id/joueurs — ajoute un joueur DEJA present dans le pool
// du tournoi (voir GET /tournois/:id/joueurs). Aucune recherche libre
// par idKoko ici : le joueurId vient forcement d'une liste deja scopee.
export async function ajouterJoueur(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const equipeId = parseInt(String(req.params.id), 10);
    const equipe = await prisma.equipe.findUnique({ where: { id: equipeId } });
    if (!equipe) return reponseErreur(res, "Equipe introuvable", 404);

    const acces = await verifierAccesTournoi(equipe.tournoiId, req.user!);
    if (!acces.ok) return reponseErreur(res, "Equipe introuvable", acces.status);
    if (!acces.estAdmin && !estTournoiModifiable(acces.statutCalcule)) {
      return reponseErreur(res, "Ce tournoi est termine, aucune modification possible", 403);
    }

    const data = ajouterJoueurSchema.parse(req.body);

    // Le joueur DOIT etre dans le pool assigne par l'ADMIN a ce tournoi
    // — sinon 404 generique, identique que le joueur n'existe pas du
    // tout ou soit simplement hors pool (aucune des deux revelee).
    const dansLePool = await prisma.tournoiJoueur.findUnique({
      where: { tournoiId_joueurId: { tournoiId: equipe.tournoiId, joueurId: data.joueurId } },
    });
    if (!dansLePool) return reponseErreur(res, "Joueur introuvable", 404);

    try {
      const ajout = await prisma.equipeJoueur.create({
        data: {
          equipeId,
          tournoiId: equipe.tournoiId,
          joueurId: data.joueurId,
          numeroDeMaillot: data.numeroDeMaillot,
        },
      });
      return reponseSucces(res, ajout, 201);
    } catch (err: any) {
      if (err.code === "P2002") {
        const cible: string[] = err.meta?.target ?? [];
        if (cible.includes("numeroDeMaillot")) {
          return reponseErreur(res, "Ce numero de maillot est deja pris dans cette equipe", 400);
        }
        return reponseErreur(res, "Ce joueur appartient deja a une equipe de ce tournoi", 400);
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

// DELETE /equipes/:id/joueurs/:joueurId
export async function retirerJoueur(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const equipeId = parseInt(String(req.params.id), 10);
    const joueurId = parseInt(String(req.params.joueurId), 10);
    const equipe = await prisma.equipe.findUnique({ where: { id: equipeId } });
    if (!equipe) return reponseErreur(res, "Equipe introuvable", 404);

    const acces = await verifierAccesTournoi(equipe.tournoiId, req.user!);
    if (!acces.ok) return reponseErreur(res, "Equipe introuvable", acces.status);
    if (!acces.estAdmin && !estTournoiModifiable(acces.statutCalcule)) {
      return reponseErreur(res, "Ce tournoi est termine, aucune modification possible", 403);
    }

    const suppression = await prisma.equipeJoueur.deleteMany({
      where: { equipeId, joueurId },
    });
    if (suppression.count === 0) {
      return reponseErreur(res, "Ce joueur n'appartient pas a cette equipe", 404);
    }

    return reponseSucces(res, { message: "Joueur retire de l'equipe" });
  } catch (err) {
    next(err);
  }
}

// PUT /equipes/:id/joueurs/:joueurId/statut — ADMIN seulement
// (certification, sans lien avec le statut du tournoi).
export async function changerStatutJoueur(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const equipeId = parseInt(String(req.params.id), 10);
    const joueurId = parseInt(String(req.params.joueurId), 10);
    const data = changerStatutJoueurSchema.parse(req.body);

    const misAJour = await prisma.equipeJoueur.updateMany({
      where: { equipeId, joueurId },
      data: { statut: data.statut },
    });
    if (misAJour.count === 0) {
      return reponseErreur(res, "Ce joueur n'appartient pas a cette equipe", 404);
    }

    return reponseSucces(res, { message: "Statut mis a jour" });
  } catch (err) {
    next(err);
  }
}

// DELETE /equipes/:id — seulement si vide (aucun joueur).
export async function supprimerEquipe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(String(req.params.id), 10);
    const equipe = await prisma.equipe.findUnique({ where: { id } });
    if (!equipe) return reponseErreur(res, "Equipe introuvable", 404);

    const acces = await verifierAccesTournoi(equipe.tournoiId, req.user!);
    if (!acces.ok) return reponseErreur(res, "Equipe introuvable", acces.status);
    if (!acces.estAdmin && !estTournoiModifiable(acces.statutCalcule)) {
      return reponseErreur(res, "Ce tournoi est termine, aucune modification possible", 403);
    }

    const nombreJoueurs = await prisma.equipeJoueur.count({ where: { equipeId: id } });
    if (nombreJoueurs > 0) {
      return reponseErreur(
        res,
        "Impossible de supprimer une equipe non vide, retirez d'abord les joueurs",
        400
      );
    }

    await prisma.equipe.delete({ where: { id } });
    return reponseSucces(res, { message: "Equipe supprimee" });
  } catch (err) {
    next(err);
  }
}

// PUT /equipes/:id/logo — ADMIN ou organisateur proprietaire. Meme
// traitement securite que l'avatar joueur (voir uploadImage.ts).
export async function uploaderLogo(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      return reponseErreur(res, "Aucun fichier envoye", 400);
    }

    const id = parseInt(String(req.params.id), 10);
    const equipe = await prisma.equipe.findUnique({ where: { id } });
    if (!equipe) return reponseErreur(res, "Equipe introuvable", 404);

    const acces = await verifierAccesTournoi(equipe.tournoiId, req.user!);
    if (!acces.ok) return reponseErreur(res, "Equipe introuvable", acces.status);
    if (!acces.estAdmin && !estTournoiModifiable(acces.statutCalcule)) {
      return reponseErreur(res, "Ce tournoi est termine, aucune modification possible", 403);
    }

    const cheminRelatif = await traiterEtEnregistrerImage(req.file.buffer, "equipes");

    await supprimerAncienneImage(equipe.logo);

    const misAJour = await prisma.equipe.update({
      where: { id },
      data: { logo: cheminRelatif },
    });

    return reponseSucces(res, misAJour);
  } catch (err) {
    next(err);
  }
}
