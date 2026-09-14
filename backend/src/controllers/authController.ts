// ================================================
// AUTH CONTROLLER — login, refresh, logout, moi
// Pas de register : tous les comptes KOKO sont crees par l'admin.
// ================================================
import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import prisma from "../utils/prisma";
import { AuthRequest } from "../middlewares/verifierAuth";
import { loginSchema } from "../utils/validation/authValidator";
import { generateAccessToken, generateRefreshToken, hashToken } from "../utils/tokens";
import { accessCookieOptions, refreshCookieOptions } from "../utils/cookies";
import { reponseSucces, reponseErreur } from "../utils/reponses";

// Hash bcrypt valide mais qui ne correspond a AUCUN vrai mot de passe —
// sert uniquement a faire tourner bcrypt.compare meme quand l'email
// n'existe pas, pour que le temps de reponse soit le meme dans les deux
// cas (sinon : un email inexistant repond plus vite, aucun hash a
// comparer — une fuite d'info par le temps, pas par le message).
const HASH_FACTICE = "$2b$10$XweQG6166fV/MTAoSnINiewu.bG853mDvqpcxlp0R/8UlVu.y00Tm";

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      await bcrypt.compare(data.motDePasse, HASH_FACTICE);
      return reponseErreur(res, "Identifiants invalides", 401);
    }

    // Mot de passe verifie AVANT le statut actif, volontairement : sans
    // preuve du bon mot de passe, personne ne doit savoir si ce compte
    // precis existe, est actif, ou desactive — toujours le meme 401
    // generique. Le message "compte desactive" n'est revele qu'a
    // quelqu'un ayant deja prouve connaitre le bon mot de passe (donc le
    // proprietaire legitime, ou quelqu'un qui a deja le mot de passe par
    // un autre moyen — dans les deux cas, l'information n'est plus une
    // fuite a ce stade).
    const motDePasseValide = await bcrypt.compare(data.motDePasse, user.motDePasse);
    if (!motDePasseValide) return reponseErreur(res, "Identifiants invalides", 401);

    if (!user.actif) return reponseErreur(res, "Ce compte a ete desactive", 403);

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = await generateRefreshToken(user.id);

    res.cookie("accessToken", accessToken, accessCookieOptions);
    res.cookie("refreshToken", refreshToken, refreshCookieOptions);

    return reponseSucces(res, {
      id: user.id,
      role: user.role,
      nom: user.nom,
      prenom: user.prenom,
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const tokenBrut = req.cookies?.refreshToken;
    if (!tokenBrut) return reponseErreur(res, "Non authentifie", 401);

    const stored = await prisma.refreshToken.findUnique({
      where: { token: hashToken(tokenBrut) },
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      return reponseErreur(res, "Session expiree, reconnecte-toi", 401);
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) return reponseErreur(res, "Utilisateur introuvable", 401);

    const newAccessToken = generateAccessToken(user.id, user.role);
    res.cookie("accessToken", newAccessToken, accessCookieOptions);

    return reponseSucces(res, { message: "Token rafraichi" });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const tokenBrut = req.cookies?.refreshToken;
    if (tokenBrut) {
      await prisma.refreshToken.updateMany({
        where: { token: hashToken(tokenBrut) },
        data: { revoked: true },
      });
    }
    res.clearCookie("accessToken", accessCookieOptions);
    res.clearCookie("refreshToken", refreshCookieOptions);
    return reponseSucces(res, { message: "Deconnexion reussie" });
  } catch (err) {
    next(err);
  }
}

// GET /auth/moi — identite du compte connecte, jamais le hash du mot de passe.
export async function moi(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        role: true,
        nom: true,
        prenom: true,
        actif: true,
      },
    });

    if (!user) {
      return reponseErreur(res, "Ce compte n'existe plus", 401);
    }

    return reponseSucces(res, user);
  } catch (err) {
    next(err);
  }
}
