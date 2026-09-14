// ================================================
// LIMITEURCODEADMIN — freine le brute force du code secret ADMIN.
// Cle sur le compte (req.user.userId), comme limiteurUpload : ces routes
// sont montees apres verifierAuth. Seuls les CODES REFUSES comptent
// (marques par verifierCodeAdmin dans res.locals) : ni les succes, ni
// les erreurs metier apres le code (404 mauvais id, 400...). Un admin
// qui travaille normalement ne se bloque jamais lui-meme, un voleur de
// session qui devine est coupe apres 5 essais pour 15 minutes.
// ================================================
import rateLimit from "express-rate-limit";
import { AuthRequest } from "./verifierAuth";

export const limiteurCodeAdmin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  requestWasSuccessful: (_req, res) => !res.locals.codeAdminRefuse,
  message: { success: false, error: "Trop de tentatives, reessaie plus tard" },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String((req as AuthRequest).user!.userId),
});
