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
