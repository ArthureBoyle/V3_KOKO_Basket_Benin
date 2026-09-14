// ================================================
// LIMITEURCODEADMIN — freine le brute force du code secret ADMIN.
// Cle sur le compte (req.user.userId), comme limiteurUpload : ces routes
// sont montees apres verifierAuth. Seuls les ECHECS comptent
// (skipSuccessfulRequests) : un admin qui travaille normalement ne se
// bloque jamais lui-meme, un voleur de session qui devine est coupe
// apres 5 essais pour 15 minutes.
// ================================================
import rateLimit from "express-rate-limit";
import { AuthRequest } from "./verifierAuth";

export const limiteurCodeAdmin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: { success: false, error: "Trop de tentatives, reessaie plus tard" },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String((req as AuthRequest).user!.userId),
});
