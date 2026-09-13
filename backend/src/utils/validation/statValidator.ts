// ================================================
// STAT VALIDATOR
// ================================================
import { z } from "zod";

// Bornes strictes, memes principe que le score du match : ordre de
// grandeur realiste pour un match de basket, jamais l'absurde.
export const saisirStatSchema = z.object({
  equipeId: z.number().int().positive(),
  points: z.number().int().min(0).max(100),
  fautes: z.number().int().min(0).max(5),
  contres: z.number().int().min(0).max(20),
  tempsJeu: z.number().int().min(0).max(60), // minutes
});

export type SaisirStatInput = z.infer<typeof saisirStatSchema>;
