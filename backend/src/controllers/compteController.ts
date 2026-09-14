// ================================================
// COMPTE CONTROLLER — creation/gestion des comptes, ADMIN seulement
// ================================================
import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { randomInt } from "crypto";
import prisma from "../utils/prisma";
import {
  creerOrganisateurSchema,
  creerJoueurSchema,
  modifierCompteSchema,
  modifierEmailReelSchema,
} from "../utils/validation/compteValidator";
import { reponseSucces, reponseErreur } from "../utils/reponses";
import { calculerStatutTournoi } from "../utils/tournoiStatut";
import { calculerStatutMatch } from "../utils/matchStatut";
import { calculerAge } from "../utils/age";

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

// Mot de passe genere par le serveur : randomInt de crypto (aleatoire cryptographique,
// contrairement a Math.random), alphabet sans caracteres ambigus
// (0/O, 1/l/I) — l'admin le transmet a l'utilisateur hors app.
const ALPHABET_MOT_DE_PASSE = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function genererMotDePasseAleatoire(longueur = 12): string {
  return Array.from(
    { length: longueur },
    () => ALPHABET_MOT_DE_PASSE[randomInt(ALPHABET_MOT_DE_PASSE.length)]
  ).join("");
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

// GET /comptes — liste tous les comptes sauf admin. Pour un joueur :
// surnom, date de naissance et age (calcule ici, jamais stocke). Pour un
// organisateur : ses tournois avec leur statut RECALCULE depuis les
// dates, jamais le statut brut de la base.
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
        joueur: { select: { idKoko: true, surnom: true, dateNaissance: true, avatar: true } },
        tournois: { select: { id: true, nom: true, statut: true, dateDebut: true, dateFin: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const resultat = comptes.map(({ joueur, tournois, ...compte }) => ({
      ...compte,
      joueur: joueur && { ...joueur, age: calculerAge(joueur.dateNaissance) },
      tournois: tournois.map((tournoi) => ({ ...tournoi, statut: calculerStatutTournoi(tournoi) })),
    }));

    return reponseSucces(res, resultat);
  } catch (err) {
    next(err);
  }
}

// GET /comptes/:id — fiche detaillee d'un compte (ADMIN).
// Joueur : identite, age, photo, ses tournois (ceux ou il est certifie,
// avec son equipe et son maillot) et ses stats toutes competitions.
// Organisateur : ses tournois. Statuts toujours recalcules. Un compte
// ADMIN repond 404, comme un compte inexistant (la liste ne les montre
// jamais non plus).
export async function getCompteById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(String(req.params.id), 10);
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        emailReel: true,
        nom: true,
        prenom: true,
        role: true,
        actif: true,
        createdAt: true,
        joueur: { select: { id: true, idKoko: true, surnom: true, dateNaissance: true, avatar: true } },
        tournois: {
          select: { id: true, nom: true, statut: true, dateDebut: true, dateFin: true },
          orderBy: { dateDebut: "desc" },
        },
      },
    });
    if (!user || user.role === "ADMIN") return reponseErreur(res, "Compte introuvable", 404);

    const { joueur, tournois, ...compte } = user;

    if (!joueur) {
      return reponseSucces(res, {
        ...compte,
        tournois: tournois.map((tournoi) => ({ ...tournoi, statut: calculerStatutTournoi(tournoi) })),
      });
    }

    const champsTournoi = { id: true, nom: true, statut: true, dateDebut: true, dateFin: true } as const;
    const [licences, inscriptions, stats] = await Promise.all([
      prisma.tournoiJoueur.findMany({
        where: { joueurId: joueur.id },
        select: { tournoiId: true, tournoi: { select: champsTournoi } },
        orderBy: { tournoi: { dateDebut: "desc" } },
      }),
      prisma.equipeJoueur.findMany({
        where: { joueurId: joueur.id },
        select: { tournoiId: true, numeroDeMaillot: true, equipe: { select: { id: true, nom: true } } },
      }),
      prisma.stat.findMany({
        where: { joueurId: joueur.id },
        select: {
          points: true,
          fautes: true,
          contres: true,
          tempsJeu: true,
          match: {
            select: {
              statut: true,
              date: true,
              score1: true,
              score2: true,
              tournoi: { select: { statut: true, dateDebut: true, dateFin: true } },
            },
          },
        },
      }),
    ]);

    const equipeParTournoi = new Map(inscriptions.map((i) => [i.tournoiId, i]));

    // Stats toutes competitions : meme regle que le classement, seuls les
    // matchs REELLEMENT termines comptent. Un tournoi annule ne compte pas.
    // Les stats d'un tournoi dont le joueur a ete retire comptent : elles
    // font partie de son historique reel (l'admin voit tout).
    const comptees = stats.filter(
      (s) =>
        calculerStatutMatch(s.match) === "TERMINE" &&
        calculerStatutTournoi(s.match.tournoi) !== "ANNULE"
    );
    const matchsJoues = comptees.length;
    const somme = (cle: "points" | "fautes" | "contres" | "tempsJeu") =>
      comptees.reduce((total, s) => total + s[cle], 0);
    const moyenne = (total: number) =>
      matchsJoues === 0 ? 0 : Math.round((total / matchsJoues) * 10) / 10;
    const totalPts = somme("points");
    const totalFautes = somme("fautes");
    const totalContres = somme("contres");
    const totalTempsJeu = somme("tempsJeu");

    return reponseSucces(res, {
      ...compte,
      joueur: { ...joueur, age: calculerAge(joueur.dateNaissance) },
      tournois: licences.map((licence) => {
        const inscription = equipeParTournoi.get(licence.tournoiId);
        return {
          tournoi: { ...licence.tournoi, statut: calculerStatutTournoi(licence.tournoi) },
          equipe: inscription
            ? { ...inscription.equipe, numeroDeMaillot: inscription.numeroDeMaillot }
            : null,
        };
      }),
      statsGlobales: {
        matchsJoues,
        totalPts,
        totalFautes,
        totalContres,
        totalTempsJeu,
        moyennePts: moyenne(totalPts),
        moyenneFautes: moyenne(totalFautes),
        moyenneContres: moyenne(totalContres),
        moyenneTempsJeu: moyenne(totalTempsJeu),
      },
    });
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
          dateNaissance: data.dateNaissance,
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
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return reponseErreur(res, "Compte introuvable", 404);
    await prisma.user.update({ where: { id }, data: { actif: true } });
    return reponseSucces(res, { message: "Compte reactive" });
  } catch (err) {
    next(err);
  }
}

// PUT /comptes/:id/reinitialiser-mot-de-passe — ADMIN + code secret.
// Identifiants perdus ou fuites : l'admin genere un NOUVEAU mot de passe
// (aleatoire, jamais choisi a la main), renvoye UNE seule fois, qu'il
// transmet a l'utilisateur hors app. L'utilisateur ne change jamais son
// mot de passe lui-meme. Toutes ses sessions sont coupees : refresh
// tokens supprimes, son access token en cours expire en 15 min max.
export async function reinitialiserMotDePasse(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(String(req.params.id), 10);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return reponseErreur(res, "Compte introuvable", 404);
    if (user.role === "ADMIN") {
      return reponseErreur(res, "Impossible de reinitialiser le mot de passe d'un compte admin", 403);
    }

    const nouveauMotDePasse = genererMotDePasseAleatoire();
    const hash = await bcrypt.hash(nouveauMotDePasse, 10);

    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { motDePasse: hash } }),
      prisma.refreshToken.deleteMany({ where: { userId: id } }),
    ]);

    return reponseSucces(res, { id, emailKoko: user.email, nouveauMotDePasse });
  } catch (err) {
    next(err);
  }
}

// PUT /comptes/:id — ADMIN, sans code. Identite seulement : nom, prenom,
// et pour un joueur surnom / dateNaissance. L'email reel passe par sa
// route protegee ; email KOKO, role et mot de passe jamais par ici.
export async function modifierCompte(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(String(req.params.id), 10);
    const user = await prisma.user.findUnique({ where: { id }, include: { joueur: true } });
    if (!user) return reponseErreur(res, "Compte introuvable", 404);
    if (user.role === "ADMIN") {
      return reponseErreur(res, "Impossible de modifier un compte admin", 403);
    }

    const data = modifierCompteSchema.parse(req.body);

    if (!user.joueur && (data.surnom !== undefined || data.dateNaissance !== undefined)) {
      return reponseErreur(res, "surnom et dateNaissance concernent uniquement les joueurs", 400);
    }

    if (user.joueur) {
      // User.nom et Joueur.nomLegal portent la meme information (voir
      // creerJoueur) : mis a jour ensemble, jamais l'un sans l'autre.
      const [, joueur] = await prisma.$transaction([
        prisma.user.update({ where: { id }, data: { nom: data.nom, prenom: data.prenom } }),
        prisma.joueur.update({
          where: { id: user.joueur.id },
          data: {
            nomLegal: data.nom,
            prenom: data.prenom,
            surnom: data.surnom,
            dateNaissance: data.dateNaissance,
          },
        }),
      ]);
      return reponseSucces(res, {
        id,
        nom: joueur.nomLegal,
        prenom: joueur.prenom,
        surnom: joueur.surnom,
        dateNaissance: joueur.dateNaissance,
      });
    }

    const misAJour = await prisma.user.update({
      where: { id },
      data: { nom: data.nom, prenom: data.prenom },
    });
    return reponseSucces(res, { id, nom: misAJour.nom, prenom: misAJour.prenom });
  } catch (err) {
    next(err);
  }
}

// PUT /comptes/:id/email-reel — ADMIN + code secret. L'email reel est le
// canal de contact hors app : le remplacer par une adresse controlee par
// un attaquant revient a s'approprier le compte. D'ou le code en plus.
export async function modifierEmailReel(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(String(req.params.id), 10);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return reponseErreur(res, "Compte introuvable", 404);
    if (user.role === "ADMIN") {
      return reponseErreur(res, "Impossible de modifier un compte admin", 403);
    }

    const data = modifierEmailReelSchema.parse(req.body);
    const misAJour = await prisma.user.update({
      where: { id },
      data: { emailReel: data.emailReel },
    });

    return reponseSucces(res, { id, emailReel: misAJour.emailReel });
  } catch (err) {
    next(err);
  }
}
