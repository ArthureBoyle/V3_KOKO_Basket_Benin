// ================================================
// TOURNOI VALIDATOR
// ================================================
import { z } from "zod";

export const creerTournoiSchema = z
  .object({
    nom: z.string().min(1).max(150),
    lieu: z.string().min(1).max(150),
    description: z.string().optional(),
    dateDebut: z.coerce.date(),
    dateFin: z.coerce.date(),
    organisateurId: z.number().int().positive(),
    // Licences payees / equipes autorisees — decidees par l'ADMIN a la
    // creation, jamais devinees ni par defaut : ca correspond a ce qui a
    // ete paye hors app.
    licencesMax: z.number().int().positive(),
    equipesMax: z.number().int().positive(),
  })
  // dateFin >= dateDebut, jamais l'inverse — un tournoi d'un seul jour
  // (dates identiques) reste valide, mais pas une fin avant le debut.
  .refine((data) => data.dateFin >= data.dateDebut, {
    message: "La date de fin doit etre posterieure ou egale a la date de debut",
    path: ["dateFin"],
  });

export const modifierTournoiSchema = z
  .object({
    nom: z.string().min(1).max(150).optional(),
    lieu: z.string().min(1).max(150).optional(),
    description: z.string().optional(),
    dateDebut: z.coerce.date().optional(),
    dateFin: z.coerce.date().optional(),
    // Reservees a l'ADMIN, meme porte que les dates — voir modifierTournoi.
    licencesMax: z.number().int().positive().optional(),
    equipesMax: z.number().int().positive().optional(),
    // Reglages du classement — reserves a l'ADMIN aussi (voir
    // utils/classement.ts), modifiables a tout moment, meme apres que
    // des matchs aient deja ete joues (le classement est toujours
    // recalcule a la volee, jamais stocke).
    algorithmeClassement: z
      .enum(["POINTS_BRUTS", "POINTS_PONDERES", "POINTS_PONDERES_FAUTES", "POINTS_PONDERES_FAUTES_CONTRES"])
      .optional(),
    coefficientLissage: z.number().int().positive().optional(),
    coefficientMalusFautes: z.number().min(0).optional(),
    coefficientBoostContres: z.number().min(0).optional(),
  })
  // Ne verifie que si LES DEUX sont fournies dans cette meme requete —
  // si une seule change, le controller doit verifier contre la date
  // deja en base (voir modifierTournoi).
  .refine(
    (data) => !data.dateDebut || !data.dateFin || data.dateFin >= data.dateDebut,
    {
      message: "La date de fin doit etre posterieure ou egale a la date de debut",
      path: ["dateFin"],
    }
  );

// Assignation d'un joueur au pool d'un tournoi (ADMIN seulement) — par
// idKoko, jamais par id numerique brut : c'est l'identifiant que l'ADMIN
// manipule humainement (le meme communique a la creation du compte).
export const assignerJoueurSchema = z.object({
  idKoko: z.string().min(1),
});

export type CreerTournoiInput = z.infer<typeof creerTournoiSchema>;
export type ModifierTournoiInput = z.infer<typeof modifierTournoiSchema>;
