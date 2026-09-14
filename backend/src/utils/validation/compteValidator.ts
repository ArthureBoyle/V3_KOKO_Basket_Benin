// ================================================
// COMPTE VALIDATOR — creation de comptes organisateur/joueur
// Pas de champ role/motDePasse ici : jamais choisis par le client,
// toujours decides par le serveur (role fixe selon la route, mot de
// passe par defaut genere cote serveur).
// ================================================
import { z } from "zod";

export const creerOrganisateurSchema = z.object({
  nom: z.string().min(1),
  prenom: z.string().min(1),
  emailReel: z.email(),
});

export const creerJoueurSchema = z.object({
  nomLegal: z.string().min(1),
  prenom: z.string().min(1),
  emailReel: z.email(),
});

// Modification d'identite par l'ADMIN (sans code). strictObject : un
// champ inconnu (emailReel, role, email, motDePasse...) est REFUSE (400)
// au lieu d'etre ignore en silence — l'email reel a sa propre route,
// protegee par le code secret. null efface surnom / dateNaissance.
export const modifierCompteSchema = z
  .strictObject({
    nom: z.string().min(1).max(100).optional(),
    prenom: z.string().min(1).max(100).optional(),
    surnom: z.string().min(1).max(50).nullable().optional(),
    dateNaissance: z.coerce.date().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Aucun champ a modifier" });

export const modifierEmailReelSchema = z.object({
  emailReel: z.email().max(254),
});

export type CreerOrganisateurInput = z.infer<typeof creerOrganisateurSchema>;
export type CreerJoueurInput = z.infer<typeof creerJoueurSchema>;

// Code secret ADMIN — exige en plus de la session pour les actions
// sensibles (voir middlewares/verifierCodeAdmin.ts). 72 max : au-dela,
// bcrypt ignore silencieusement les octets en trop.
export const CODE_ADMIN_LONGUEUR_MIN = 12;
export const CODE_ADMIN_LONGUEUR_MAX = 72;

export const codeAdminSchema = z.object({
  codeAdmin: z.string().min(1).max(CODE_ADMIN_LONGUEUR_MAX),
});
