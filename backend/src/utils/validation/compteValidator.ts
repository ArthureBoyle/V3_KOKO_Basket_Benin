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

// Date de naissance d'un joueur : l'admin certifie son age, elle est
// donc OBLIGATOIRE a la creation. Jamais dans le futur, jamais avant 1900
// (faute de frappe du type "0199-05-17").
// Texte "YYYY-MM-DD" valide D'ABORD (z.iso.date), converti en Date
// ENSUITE : un z.coerce.date() seul accepterait null (new Date(null) =
// 1er janvier 1970) et ecraserait la vraie date sans erreur.
const dateNaissanceSchema = z.iso
  .date()
  .pipe(z.coerce.date())
  .refine((d) => d <= new Date(), { message: "La date de naissance ne peut pas etre dans le futur" })
  .refine((d) => d >= new Date("1900-01-01"), { message: "Date de naissance invalide" });

export const creerJoueurSchema = z.object({
  nomLegal: z.string().min(1),
  prenom: z.string().min(1),
  emailReel: z.email(),
  dateNaissance: dateNaissanceSchema,
});

// Modification d'identite par l'ADMIN (sans code). strictObject : un
// champ inconnu (emailReel, role, email, motDePasse...) est REFUSE (400)
// au lieu d'etre ignore en silence — l'email reel a sa propre route,
// protegee par le code secret. null efface le surnom ; la date de
// naissance, obligatoire depuis la creation, se corrige mais ne s'efface pas.
export const modifierCompteSchema = z
  .strictObject({
    nom: z.string().min(1).max(100).optional(),
    prenom: z.string().min(1).max(100).optional(),
    surnom: z.string().min(1).max(50).nullable().optional(),
    dateNaissance: dateNaissanceSchema.optional(),
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
