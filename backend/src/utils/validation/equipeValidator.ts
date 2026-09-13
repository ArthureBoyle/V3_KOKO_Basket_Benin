// ================================================
// EQUIPE VALIDATOR
// ================================================
import { z } from "zod";

export const creerEquipeSchema = z.object({
  tournoiId: z.number().int().positive(),
  nom: z.string().min(1).max(100),
  couleur: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide, format attendu #RRGGBB"),
  logo: z.string().optional(),
});

// L'organisateur choisit un joueur PARMI le pool deja assigne par
// l'ADMIN a ce tournoi (voir GET /tournois/:id/joueurs) — jamais un
// idKoko saisi a l'aveugle, jamais de recherche libre.
export const ajouterJoueurSchema = z.object({
  joueurId: z.number().int().positive(),
  numeroDeMaillot: z.number().int().min(0).max(99),
});

export const changerStatutJoueurSchema = z.object({
  statut: z.enum(["EN_ATTENTE", "CERTIFIE", "SUSPENDU"]),
});

export type CreerEquipeInput = z.infer<typeof creerEquipeSchema>;
export type AjouterJoueurInput = z.infer<typeof ajouterJoueurSchema>;
export type ChangerStatutJoueurInput = z.infer<typeof changerStatutJoueurSchema>;
