// ================================================
// VERIFIERAUTH — verifie l'access token avant d'acceder a une route
// ================================================
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { reponseErreur } from "../utils/reponses";

export interface AuthRequest extends Request {
  user?: { userId: number; role: string };
}

export function verifierAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.accessToken;

  if (!token) {
    return reponseErreur(res, "Non authentifie", 401);
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET as string) as {
      userId: number;
      role: string;
    };
    req.user = { userId: payload.userId, role: payload.role };
    return next();
  } catch (err) {
    return reponseErreur(res, "Session invalide ou expiree", 401);
  }
}
