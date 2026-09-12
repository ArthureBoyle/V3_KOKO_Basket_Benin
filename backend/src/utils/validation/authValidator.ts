// ================================================
// AUTH VALIDATOR — pas de registerSchema : KOKO n'a aucune
// auto-inscription, tous les comptes sont crees par l'admin.
// ================================================
import { z } from "zod";

export const loginSchema = z.object({
  email: z.email(),
  motDePasse: z.string(),
});

export const changerMotDePasseSchema = z.object({
  ancienMotDePasse: z.string(),
  nouveauMotDePasse: z.string().min(8),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangerMotDePasseInput = z.infer<typeof changerMotDePasseSchema>;
