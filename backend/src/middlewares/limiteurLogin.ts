import rateLimit from "express-rate-limit";

// 10 tentatives par IP toutes les 15 minutes sur /auth/login — protection
// brute force, absente de la V2 de KOKO.
export const limiteurLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: "Trop de tentatives, reessaie plus tard" },
  standardHeaders: true,
  legacyHeaders: false,
});
