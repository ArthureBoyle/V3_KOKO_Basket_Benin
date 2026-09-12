// ================================================
// COMPTE CONTROLLER — creation/gestion des comptes, ADMIN seulement
// ================================================
import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import prisma from "../utils/prisma";
import {
  creerOrganisateurSchema,
  creerJoueurSchema,
} from "../utils/validation/compteValidator";
import { reponseSucces, reponseErreur } from "../utils/reponses";

const MOT_DE_PASSE_ORGANISATEUR_DEFAUT = "Orga2025!";
const MOT_DE_PASSE_JOUEUR_DEFAUT = "Koko2025!";

// Suffixe ALEATOIRE, pas un compteur sequentiel — un numero qui grimpe
// simplement revele a n'importe qui voyant UN SEUL email/idKoko combien
// de comptes existent deja (fuite d'information sur le volume interne,
// pire encore pour idKoko : concu pour etre vu par des tiers - badges,
// recruteurs). Un suffixe aleatoire ne revele rien de tel.
function genererSuffixeAleatoire(longueur: number): string {
  const chiffres = "0123456789";
  return Array.from({ length: longueur }, () => chiffres[Math.floor(Math.random() * 10)]).join("");
}

async function genererEmailKoko(prenom: string, nom: string): Promise<string> {
  const initiales = (prenom[0] + nom[0]).toLowerCase();
  for (let tentative = 0; tentative < 10; tentative++) {
    const email = `${initiales}${genererSuffixeAleatoire(4)}@koko.bj`;
    const existant = await prisma.user.findUnique({ where: { email } });
    if (!existant) return email;
  }
  throw new Error("Impossible de generer un email KOKO unique apres 10 tentatives");
}

async function genererIdKoko(): Promise<string> {
  const annee = new Date().getFullYear();
  for (let tentative = 0; tentative < 10; tentative++) {
    const idKoko = `KOKO-${annee}-${genererSuffixeAleatoire(4)}`;
    const existant = await prisma.joueur.findUnique({ where: { idKoko } });
    if (!existant) return idKoko;
  }
  throw new Error("Impossible de generer un idKoko unique apres 10 tentatives");
}

// GET /comptes — liste tous les comptes sauf admin
export async function getComptes(req: Request, res: Response, next: NextFunction) {
  try {
    const comptes = await prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      select: {
        id: true,
        email: true,
        emailReel: true,
        nom: true,
        prenom: true,
        role: true,
        actif: true,
        createdAt: true,
        joueur: { select: { idKoko: true } },
        tournois: { select: { id: true, nom: true, statut: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return reponseSucces(res, comptes);
  } catch (err) {
    next(err);
  }
}

// POST /comptes/organisateur
export async function creerOrganisateur(req: Request, res: Response, next: NextFunction) {
  try {
    const data = creerOrganisateurSchema.parse(req.body);
    const email = await genererEmailKoko(data.prenom, data.nom);
    const hash = await bcrypt.hash(MOT_DE_PASSE_ORGANISATEUR_DEFAUT, 10);

    const user = await prisma.user.create({
      data: {
        email,
        emailReel: data.emailReel,
        motDePasse: hash,
        role: "ORGANISATEUR",
        nom: data.nom,
        prenom: data.prenom,
        // mustChangePassword: true est deja la valeur par defaut du
        // schema — c'est elle qui force le changement au premier login.
      },
    });

    return reponseSucces(
      res,
      { id: user.id, emailKoko: user.email, motDePasse: MOT_DE_PASSE_ORGANISATEUR_DEFAUT },
      201
    );
  } catch (err) {
    next(err);
  }
}

// POST /comptes/joueur
export async function creerJoueur(req: Request, res: Response, next: NextFunction) {
  try {
    const data = creerJoueurSchema.parse(req.body);
    const email = await genererEmailKoko(data.prenom, data.nomLegal);
    const idKoko = await genererIdKoko();
    const hash = await bcrypt.hash(MOT_DE_PASSE_JOUEUR_DEFAUT, 10);

    const resultat = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          emailReel: data.emailReel,
          motDePasse: hash,
          role: "JOUEUR",
          nom: data.nomLegal,
          prenom: data.prenom,
        },
      });
      const joueur = await   tx.joueur.create({
        data: {
          idKoko,
          nomLegal: data.nomLegal,
          prenom: data.prenom,
          userId: user.id,
        },
      });
      return { user, joueur };
    });

    return reponseSucces(
      res,
      {
        id: resultat.joueur.id,
        idKoko: resultat.joueur.idKoko,
        emailKoko: resultat.user.email,
        motDePasse: MOT_DE_PASSE_JOUEUR_DEFAUT,
      },
      201
    );
  } catch (err) {
    next(err);
  }
}

// PUT /comptes/:id/desactiver
export async function desactiverCompte(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(String(req.params.id), 10);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return reponseErreur(res, "Compte introuvable", 404);
    if (user.role === "ADMIN") {
      return reponseErreur(res, "Impossible de desactiver le compte admin", 403);
    }
    await prisma.user.update({ where: { id }, data: { actif: false } });
    return reponseSucces(res, { message: "Compte desactive" });
  } catch (err) {
    next(err);
  }
}

// PUT /comptes/:id/reactiver
export async function reactiverCompte(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(String(req.params.id), 10);
    await prisma.user.update({ where: { id }, data: { actif: true } });
    return reponseSucces(res, { message: "Compte reactive" });
  } catch (err) {
    next(err);
  }
}
