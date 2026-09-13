// ================================================
// ERRORHANDLER — filet de securite centralise
// ================================================
// Reconnu par Express comme gestionnaire d'erreur UNIQUEMENT parce qu'il a
// exactement 4 parametres (err, req, res, next) — pas une convention de
// nom, un comportement interne d'Express base sur l'arite de la fonction.
// Doit etre monte en DERNIER dans server.ts, apres toutes les routes.
import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import multer from "multer";
import { reponseErreur } from "../utils/reponses";
import { ErreurFichierInvalide } from "../utils/uploadImage";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(err);

  if (err instanceof ZodError) {
    return reponseErreur(res, "Donnees invalides", 400);
  }

  // Fichier trop volumineux, champ inattendu, etc. — leve par multer
  // lui-meme, avant meme d'atteindre le controller.
  if (err instanceof multer.MulterError) {
    return reponseErreur(res, err.message, 400);
  }

  // Mauvais format / contenu reel invalide — leve par uploadImage.ts.
  if (err instanceof ErreurFichierInvalide) {
    return reponseErreur(res, err.message, 400);
  }

  return reponseErreur(res, "Erreur serveur", 500);
}
