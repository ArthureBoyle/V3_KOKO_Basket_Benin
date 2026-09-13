// ================================================
// LIMITEURUPLOAD — freine le spam d'uploads (chaque upload fait tourner
// sharp, couteux en CPU) sur un COMPTE, pas juste une IP. Cle sur
// req.user.userId plutot que l'IP par defaut : ces routes sont deja
// montees apres verifierAuth, donc req.user existe toujours ici — et un
// compte compromis derriere un NAT partage ne doit pas se cacher
// derriere le trafic d'autres utilisateurs de la meme IP.
// ================================================
import rateLimit from "express-rate-limit";
import { AuthRequest } from "./verifierAuth";

export const limiteurUpload = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: "Trop d'uploads, reessaie plus tard" },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String((req as AuthRequest).user!.userId),
});
