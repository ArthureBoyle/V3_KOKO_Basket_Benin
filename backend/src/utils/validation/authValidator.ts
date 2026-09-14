// ================================================
// AUTH VALIDATOR — pas de registerSchema : KOKO n'a aucune
// auto-inscription, tous les comptes sont crees par l'admin. Pas de
// changement de mot de passe cote utilisateur non plus : seul l'admin
// en genere un nouveau (voir reinitialiserMotDePasse).
// ================================================
import { z } from "zod";

export const loginSchema = z.object({
  email: z.email(),
  motDePasse: z.string(),
});

export type LoginInput = z.infer<typeof loginSchema>;
