// ================================================
// VERIFIERROLE — factory de middleware, verifie le role apres verifierAuth
// ================================================
import { Response, NextFunction } from "express";
import { AuthRequest } from "./verifierAuth";
import { reponseErreur } from "../utils/reponses";

export function verifierRole(...rolesAutorises: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return reponseErreur(res, "Non authentifie", 401);
    }
    if (!rolesAutorises.includes(req.user.role)) {
      return reponseErreur(res, "Acces refuse", 403);
    }
    return next();
  };
}
