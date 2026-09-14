// ================================================
// VERIFIERCODEADMIN — deuxieme verrou sur les actions sensibles ADMIN
// (reset mot de passe, email reel, desactivation, reattribution).
// La session seule ne suffit pas : un cookie vole ne permet pas ces
// actions sans le code, que l'admin tape a chaque fois.
//
// A monter APRES verifierAuth + verifierRole("ADMIN") + limiteurCodeAdmin.
// Le code arrive dans le body (champ codeAdmin), jamais en query string
// (les URLs finissent dans les logs).
// ================================================
import { Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import prisma from "../utils/prisma";
import { AuthRequest } from "./verifierAuth";
import { reponseErreur } from "../utils/reponses";
import { codeAdminSchema } from "../utils/validation/compteValidator";

export async function verifierCodeAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const saisie = codeAdminSchema.safeParse(req.body ?? {});
    if (!saisie.success) {
      return reponseErreur(res, "Code admin invalide", 403);
    }

    const admin = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { codeSecretAdmin: true },
    });
    if (!admin?.codeSecretAdmin) {
      return reponseErreur(
        res,
        "Aucun code admin defini sur ce compte (scripts/definir-code-admin.ts)",
        403
      );
    }

    const valide = await bcrypt.compare(saisie.data.codeAdmin, admin.codeSecretAdmin);
    if (!valide) {
      return reponseErreur(res, "Code admin invalide", 403);
    }

    return next();
  } catch (err) {
    next(err);
  }
}
