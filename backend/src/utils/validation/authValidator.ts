// ================================================
// AUTH VALIDATOR — pas de registerSchema : KOKO n'a aucune
// auto-inscription, tous les comptes sont crees par l'admin.
// ================================================
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  motDePasse: z.string(),
});

export type LoginInput = z.infer<typeof loginSchema>;
