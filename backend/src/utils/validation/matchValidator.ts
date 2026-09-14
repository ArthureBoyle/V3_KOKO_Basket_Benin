// ================================================
// MATCH VALIDATOR
// ================================================
import { z } from "zod";
import { instantSchema } from "./dates";

export const creerMatchSchema = z
  .object({
    tournoiId: z.number().int().positive(),
    equipe1Id: z.number().int().positive(),
    equipe2Id: z.number().int().positive(),
    // Date ET heure, fuseau obligatoire (voir dates.ts : null refuse).
    date: instantSchema,
    lieu: z.string().min(1).max(150),
    type: z.string().min(1).max(50),
    arbitre: z.string().max(100).optional(),
  })
  .refine((data) => data.equipe1Id !== data.equipe2Id, {
    message: "Une equipe ne peut pas jouer contre elle-meme",
    path: ["equipe2Id"],
  });

// Champs operationnels/cosmetiques seulement — la date passe par
// reporterMatch/reprogrammerMatch, jamais par une modification directe.
export const modifierMatchSchema = z.object({
  lieu: z.string().min(1).max(150).optional(),
  type: z.string().min(1).max(50).optional(),
  arbitre: z.string().max(100).optional(),
});

// Bornes strictes : un score de basket reste dans un ordre de grandeur
// raisonnable, meme sur une saisie erronee on refuse l'absurde (ex:
// score negatif ou a 4 chiffres).
export const saisirScoreSchema = z.object({
  score1: z.number().int().min(0).max(200),
  score2: z.number().int().min(0).max(200),
});

export const reprogrammerMatchSchema = z.object({
  nouvelleDate: instantSchema,
});

export type CreerMatchInput = z.infer<typeof creerMatchSchema>;
export type ModifierMatchInput = z.infer<typeof modifierMatchSchema>;
export type SaisirScoreInput = z.infer<typeof saisirScoreSchema>;
export type ReprogrammerMatchInput = z.infer<typeof reprogrammerMatchSchema>;
