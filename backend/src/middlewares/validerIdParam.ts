// ================================================
// VALIDER ID PARAM — a brancher avec router.param("id", ...).
// Un id d'URL qui n'est pas un entier positif ("NaN", "369ABC", "-1")
// ne peut correspondre a aucune ressource : 404 propre, jamais une
// erreur Prisma qui remonterait en 500.
// ================================================
import { NextFunction, Request, Response } from "express";
import { reponseErreur } from "../utils/reponses";

export function validerIdParam(_req: Request, res: Response, next: NextFunction, valeur: string) {
  if (!/^[1-9]\d{0,9}$/.test(valeur)) {
    return reponseErreur(res, "Ressource introuvable", 404);
  }
  next();
}
