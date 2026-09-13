// ================================================
// OPENAPI — genere a la main a partir des VRAIS schemas Zod deja
// ecrits (z.toJSONSchema, natif a Zod v4 depuis cette version — aucune
// lib de conversion tierce necessaire). Un seul endroit de verite pour
// la validation ET la doc : si un schema Zod change, la doc suit sans
// jamais etre reecrite a la main.
// ================================================
import { z } from "zod";
import { loginSchema, changerMotDePasseSchema } from "../utils/validation/authValidator";
import { creerOrganisateurSchema, creerJoueurSchema } from "../utils/validation/compteValidator";
import {
  creerTournoiSchema,
  modifierTournoiSchema,
  assignerJoueurSchema,
} from "../utils/validation/tournoiValidator";
import {
  creerEquipeSchema,
  ajouterJoueurSchema,
  changerStatutJoueurSchema,
} from "../utils/validation/equipeValidator";
import {
  creerMatchSchema,
  modifierMatchSchema,
  saisirScoreSchema,
  reprogrammerMatchSchema,
} from "../utils/validation/matchValidator";
import { saisirStatSchema } from "../utils/validation/statValidator";

// ---- petits helpers pour ne pas repeter la meme structure 50 fois ----

// z.coerce.date() (dates de tournoi/match) n'a pas de representation
// JSON Schema native -- toJSONSchema leve une erreur par defaut dessus.
// On la representate explicitement en "string, format date-time" (ce
// qu'elle est reellement une fois serialisee en JSON), plutot que de
// laisser passer un {} vide (unrepresentable: "any" sans override).
function corps(schema: z.ZodTypeAny) {
  const jsonSchema = z.toJSONSchema(schema, {
    unrepresentable: "any",
    override: (ctx: any) => {
      if (ctx.zodSchema?._zod?.def?.type === "date") {
        ctx.jsonSchema.type = "string";
        ctx.jsonSchema.format = "date-time";
      }
    },
  });
  return {
    required: true,
    content: { "application/json": { schema: jsonSchema } },
  };
}

function succes(description: string) {
  return {
    description,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: { success: { type: "boolean", example: true }, data: {} },
        },
      },
    },
  };
}

const ref = (nom: string) => ({ $ref: `#/components/responses/${nom}` });

// Reponses standard partagees — evite de repeter la meme enveloppe
// d'erreur {success:false, error:"..."} sur chaque route.
const responsesStandard = {
  NonAuthentifie: {
    description: "Cookie accessToken absent ou invalide",
    content: { "application/json": { schema: { $ref: "#/components/schemas/Erreur" } } },
  },
  AccesRefuse: {
    description: "Role insuffisant pour cette action",
    content: { "application/json": { schema: { $ref: "#/components/schemas/Erreur" } } },
  },
  Introuvable: {
    description: "Ressource introuvable (ou masquee : pas proprietaire, annulee, hors pool...)",
    content: { "application/json": { schema: { $ref: "#/components/schemas/Erreur" } } },
  },
  DonneesInvalides: {
    description: "Corps de requete invalide (Zod)",
    content: { "application/json": { schema: { $ref: "#/components/schemas/Erreur" } } },
  },
  TropDeRequetes: {
    description: "Rate-limit depasse",
    content: { "application/json": { schema: { $ref: "#/components/schemas/Erreur" } } },
  },
};

const paramId = (nom: string, description: string) => ({
  name: nom,
  in: "path" as const,
  required: true,
  schema: { type: "integer" },
  description,
});

export const openapiDocument = {
  openapi: "3.1.0",
  info: {
    title: "KOKO API",
    version: "3.0.0",
    description:
      "API du backend KOKO V3 — gestion de tournois de basket (Benin). " +
      "Enveloppe de reponse unique partout : {success, data} ou {success:false, error}.",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Auth" },
    { name: "Comptes" },
    { name: "Tournois" },
    { name: "Equipes" },
    { name: "Matchs" },
    { name: "Stat" },
    { name: "Classement" },
    { name: "Joueur" },
  ],
  components: {
    securitySchemes: {
      cookieAuth: { type: "apiKey", in: "cookie", name: "accessToken" },
    },
    schemas: {
      Erreur: {
        type: "object",
        properties: { success: { type: "boolean", example: false }, error: { type: "string" } },
      },
    },
    responses: responsesStandard,
  },
  security: [{ cookieAuth: [] }],
  paths: {
    // ============ AUTH ============
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Connexion — pose accessToken (15min) + refreshToken (7j) en cookies httpOnly",
        security: [],
        requestBody: corps(loginSchema),
        responses: {
          "200": succes("Connecte, cookies poses"),
          "401": { description: "Identifiants invalides ou compte desactive (message generique volontaire)" },
          "429": ref("TropDeRequetes"),
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Renouvelle l'accessToken a partir du refreshToken",
        security: [],
        responses: { "200": succes("Nouvel accessToken pose"), "401": ref("NonAuthentifie") },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Revoque le refreshToken en base, efface les cookies",
        security: [],
        responses: { "200": succes("Deconnecte") },
      },
    },
    "/auth/moi": {
      get: {
        tags: ["Auth"],
        summary: "Identite du compte connecte",
        responses: { "200": succes("Profil basique"), "401": ref("NonAuthentifie") },
      },
    },
    "/auth/changer-mot-de-passe": {
      post: {
        tags: ["Auth"],
        summary: "Change son propre mot de passe",
        requestBody: corps(changerMotDePasseSchema),
        responses: {
          "200": succes("Mot de passe change"),
          "401": { description: "Ancien mot de passe incorrect ou non authentifie" },
          "400": ref("DonneesInvalides"),
        },
      },
    },

    // ============ COMPTES (ADMIN uniquement) ============
    "/comptes": {
      get: {
        tags: ["Comptes"],
        summary: "Liste tous les comptes (sauf ADMIN)",
        responses: { "200": succes("Liste des comptes"), "401": ref("NonAuthentifie"), "403": ref("AccesRefuse") },
      },
    },
    "/comptes/organisateur": {
      post: {
        tags: ["Comptes"],
        summary: "Cree un compte ORGANISATEUR (email/mot de passe generes serveur)",
        requestBody: corps(creerOrganisateurSchema),
        responses: { "201": succes("Compte cree"), "400": ref("DonneesInvalides"), "403": ref("AccesRefuse") },
      },
    },
    "/comptes/joueur": {
      post: {
        tags: ["Comptes"],
        summary: "Cree un compte JOUEUR + fiche Joueur (idKoko genere) en une transaction",
        requestBody: corps(creerJoueurSchema),
        responses: { "201": succes("Compte + joueur crees"), "400": ref("DonneesInvalides"), "403": ref("AccesRefuse") },
      },
    },
    "/comptes/{id}/desactiver": {
      put: {
        tags: ["Comptes"],
        summary: "Desactive un compte (login refuse ensuite)",
        parameters: [paramId("id", "id du compte User")],
        responses: { "200": succes("Compte desactive"), "403": ref("AccesRefuse"), "404": ref("Introuvable") },
      },
    },
    "/comptes/{id}/reactiver": {
      put: {
        tags: ["Comptes"],
        summary: "Reactive un compte desactive",
        parameters: [paramId("id", "id du compte User")],
        responses: { "200": succes("Compte reactive"), "403": ref("AccesRefuse"), "404": ref("Introuvable") },
      },
    },

    // ============ TOURNOIS ============
    "/tournois": {
      get: {
        tags: ["Tournois"],
        summary: "Liste tous les tournois (ADMIN), filtrable par ?organisateurId= et ?statut=",
        responses: { "200": succes("Liste"), "403": ref("AccesRefuse") },
      },
      post: {
        tags: ["Tournois"],
        summary: "Cree un tournoi (ADMIN seulement — licences/equipesMax fixees a la creation)",
        requestBody: corps(creerTournoiSchema),
        responses: { "201": succes("Tournoi cree"), "400": ref("DonneesInvalides"), "403": ref("AccesRefuse") },
      },
    },
    "/tournois/mes-tournois": {
      get: {
        tags: ["Tournois"],
        summary: "Tournois de l'organisateur connecte (jamais les ANNULE), filtrable par ?statut=",
        responses: { "200": succes("Liste"), "403": ref("AccesRefuse") },
      },
    },
    "/tournois/{id}": {
      get: {
        tags: ["Tournois"],
        summary: "Detail d'un tournoi (ADMIN ou proprietaire ; 404 generique sinon)",
        parameters: [paramId("id", "id du tournoi")],
        responses: { "200": succes("Detail"), "404": ref("Introuvable") },
      },
      put: {
        tags: ["Tournois"],
        summary: "Modifie un tournoi — dates/licences/classement reserves a l'ADMIN",
        parameters: [paramId("id", "id du tournoi")],
        requestBody: corps(modifierTournoiSchema),
        responses: {
          "200": succes("Tournoi modifie"),
          "400": ref("DonneesInvalides"),
          "403": { description: "Champ reserve ADMIN envoye par un organisateur, ou tournoi non modifiable" },
          "404": ref("Introuvable"),
        },
      },
    },
    "/tournois/{id}/annuler": {
      put: {
        tags: ["Tournois"],
        summary: "Annule un tournoi (ADMIN seulement)",
        parameters: [paramId("id", "id du tournoi")],
        responses: { "200": succes("Tournoi annule"), "403": ref("AccesRefuse"), "404": ref("Introuvable") },
      },
    },
    "/tournois/{id}/reactiver": {
      put: {
        tags: ["Tournois"],
        summary: "Reactive un tournoi annule (ADMIN seulement)",
        parameters: [paramId("id", "id du tournoi")],
        responses: { "200": succes("Tournoi reactive"), "403": ref("AccesRefuse"), "404": ref("Introuvable") },
      },
    },
    "/tournois/{id}/joueurs": {
      get: {
        tags: ["Tournois"],
        summary: "Pool de licences du tournoi (ADMIN ou proprietaire)",
        parameters: [paramId("id", "id du tournoi")],
        responses: { "200": succes("Pool"), "404": ref("Introuvable") },
      },
      post: {
        tags: ["Tournois"],
        summary: "Assigne un joueur (par idKoko) au pool du tournoi (ADMIN seulement)",
        parameters: [paramId("id", "id du tournoi")],
        requestBody: corps(assignerJoueurSchema),
        responses: {
          "201": succes("Joueur assigne"),
          "400": { description: "Limite de licences atteinte ou deja assigne" },
          "403": ref("AccesRefuse"),
          "404": { description: "Tournoi ou joueur (idKoko) introuvable" },
        },
      },
    },
    "/tournois/{id}/joueurs/{joueurId}": {
      delete: {
        tags: ["Tournois"],
        summary: "Desassigne un joueur du pool (ADMIN seulement, refuse s'il est encore dans une equipe)",
        parameters: [paramId("id", "id du tournoi"), paramId("joueurId", "id du joueur")],
        responses: { "200": succes("Joueur desassigne"), "400": { description: "Encore dans une equipe" }, "403": ref("AccesRefuse"), "404": ref("Introuvable") },
      },
    },
    "/tournois/{id}/classement": {
      get: {
        tags: ["Classement"],
        summary: "Classement joueurs (ADMIN, organisateur proprietaire, ou JOUEUR du pool). Filtrable par ?matchsJoues=",
        parameters: [paramId("id", "id du tournoi")],
        responses: { "200": succes("Classement joueurs, tries par score"), "404": ref("Introuvable") },
      },
    },
    "/tournois/{id}/classement-equipes": {
      get: {
        tags: ["Classement"],
        summary: "Classement equipes (victoires/defaites), aucune Stat necessaire",
        parameters: [paramId("id", "id du tournoi")],
        responses: { "200": succes("Classement equipes"), "404": ref("Introuvable") },
      },
    },

    // ============ EQUIPES ============
    "/equipes": {
      get: {
        tags: ["Equipes"],
        summary: "Liste les equipes (?tournoiId= obligatoire pour un organisateur)",
        responses: { "200": succes("Liste"), "400": { description: "tournoiId requis" } },
      },
      post: {
        tags: ["Equipes"],
        summary: "Cree une equipe (bloque si equipesMax atteint pour ce tournoi)",
        requestBody: corps(creerEquipeSchema),
        responses: { "201": succes("Equipe creee"), "400": ref("DonneesInvalides"), "404": ref("Introuvable") },
      },
    },
    "/equipes/{id}": {
      get: {
        tags: ["Equipes"],
        summary: "Detail d'une equipe avec sa liste de joueurs",
        parameters: [paramId("id", "id de l'equipe")],
        responses: { "200": succes("Detail"), "404": ref("Introuvable") },
      },
      delete: {
        tags: ["Equipes"],
        summary: "Supprime une equipe (seulement si vide)",
        parameters: [paramId("id", "id de l'equipe")],
        responses: { "200": succes("Equipe supprimee"), "400": { description: "Equipe non vide" }, "404": ref("Introuvable") },
      },
    },
    "/equipes/{id}/joueurs": {
      post: {
        tags: ["Equipes"],
        summary: "Ajoute un joueur du pool a l'equipe (numero de maillot requis)",
        parameters: [paramId("id", "id de l'equipe")],
        requestBody: corps(ajouterJoueurSchema),
        responses: {
          "201": succes("Joueur ajoute"),
          "400": { description: "Numero de maillot deja pris, ou deja dans une equipe de ce tournoi" },
          "404": { description: "Equipe introuvable, ou joueur hors du pool de ce tournoi" },
        },
      },
    },
    "/equipes/{id}/joueurs/{joueurId}": {
      delete: {
        tags: ["Equipes"],
        summary: "Retire un joueur de l'equipe",
        parameters: [paramId("id", "id de l'equipe"), paramId("joueurId", "id du joueur")],
        responses: { "200": succes("Joueur retire"), "404": ref("Introuvable") },
      },
    },
    "/equipes/{id}/joueurs/{joueurId}/statut": {
      put: {
        tags: ["Equipes"],
        summary: "Change le statut de certification d'un joueur (ADMIN seulement)",
        parameters: [paramId("id", "id de l'equipe"), paramId("joueurId", "id du joueur")],
        requestBody: corps(changerStatutJoueurSchema),
        responses: { "200": succes("Statut mis a jour"), "403": ref("AccesRefuse"), "404": ref("Introuvable") },
      },
    },
    "/equipes/{id}/logo": {
      put: {
        tags: ["Equipes"],
        summary: "Upload le logo de l'equipe (multipart/form-data, champ 'logo', max 3 Mo, jpeg/png/webp)",
        parameters: [paramId("id", "id de l'equipe")],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: { type: "object", properties: { logo: { type: "string", format: "binary" } } },
            },
          },
        },
        responses: {
          "200": succes("Logo enregistre, ancien fichier supprime"),
          "400": { description: "Fichier invalide, trop volumineux, ou aucun fichier envoye" },
          "404": ref("Introuvable"),
          "429": ref("TropDeRequetes"),
        },
      },
    },

    // ============ MATCHS ============
    "/matchs": {
      get: {
        tags: ["Matchs"],
        summary: "Liste les matchs (?tournoiId= obligatoire pour un organisateur, filtrable par ?statut=)",
        responses: { "200": succes("Liste"), "400": { description: "tournoiId requis" } },
      },
      post: {
        tags: ["Matchs"],
        summary: "Cree un match (equipes distinctes, appartenant au tournoi)",
        requestBody: corps(creerMatchSchema),
        responses: { "201": succes("Match cree"), "400": ref("DonneesInvalides"), "404": ref("Introuvable") },
      },
    },
    "/matchs/{id}": {
      get: {
        tags: ["Matchs"],
        summary: "Detail d'un match (statut recalcule a la volee)",
        parameters: [paramId("id", "id du match")],
        responses: { "200": succes("Detail"), "404": ref("Introuvable") },
      },
      put: {
        tags: ["Matchs"],
        summary: "Modifie lieu/type/arbitre (jamais la date, voir /reporter)",
        parameters: [paramId("id", "id du match")],
        requestBody: corps(modifierMatchSchema),
        responses: { "200": succes("Match modifie"), "403": { description: "Match non modifiable" }, "404": ref("Introuvable") },
      },
    },
    "/matchs/{id}/score": {
      put: {
        tags: ["Matchs"],
        summary: "Saisit/corrige le score (2 corrections max pour l'organisateur, illimite ADMIN)",
        parameters: [paramId("id", "id du match")],
        requestBody: corps(saisirScoreSchema),
        responses: {
          "200": succes("Score corrige"),
          "400": { description: "Match annule/reporte, ou bornes de score invalides" },
          "403": { description: "Limite de corrections atteinte" },
          "404": ref("Introuvable"),
        },
      },
    },
    "/matchs/{id}/annuler": { put: { tags: ["Matchs"], summary: "Annule un match", parameters: [paramId("id", "id du match")], responses: { "200": succes("Match annule"), "404": ref("Introuvable") } } },
    "/matchs/{id}/reactiver": {
      put: {
        tags: ["Matchs"],
        summary: "Reactive un match ANNULE (refuse sur un match REPORTE — voir /reprogrammer)",
        parameters: [paramId("id", "id du match")],
        responses: { "200": succes("Match reactive"), "400": { description: "Ce match n'est pas annule" }, "404": ref("Introuvable") },
      },
    },
    "/matchs/{id}/reporter": {
      put: {
        tags: ["Matchs"],
        summary: "Passe le match en REPORTE, sans nouvelle date (voir /reprogrammer ensuite)",
        parameters: [paramId("id", "id du match")],
        responses: { "200": succes("Match reporte"), "400": { description: "Match annule/termine/deja reporte" }, "404": ref("Introuvable") },
      },
    },
    "/matchs/{id}/reprogrammer": {
      put: {
        tags: ["Matchs"],
        summary: "Fixe la nouvelle date d'un match REPORTE",
        parameters: [paramId("id", "id du match")],
        requestBody: corps(reprogrammerMatchSchema),
        responses: { "200": succes("Match reprogramme"), "400": { description: "Ce match n'est pas en attente de reprogrammation" }, "404": ref("Introuvable") },
      },
    },
    "/matchs/{id}/stats": {
      get: {
        tags: ["Stat"],
        summary: "Stats detaillees de tous les joueurs pour ce match",
        parameters: [paramId("id", "id du match")],
        responses: { "200": succes("Liste des stats"), "404": ref("Introuvable") },
      },
    },
    "/matchs/{id}/stats/{joueurId}": {
      put: {
        tags: ["Stat"],
        summary: "Saisit/corrige la stat d'un joueur (match doit deja etre TERMINE)",
        parameters: [paramId("id", "id du match"), paramId("joueurId", "id du joueur")],
        requestBody: corps(saisirStatSchema),
        responses: {
          "201": succes("Stat creee"),
          "200": succes("Stat corrigee"),
          "400": { description: "Score du match pas encore saisi, ou bornes invalides" },
          "403": { description: "Limite de corrections atteinte" },
          "404": { description: "Match introuvable, ou joueur hors du match" },
        },
      },
      delete: {
        tags: ["Stat"],
        summary: "Supprime une stat (ADMIN seulement)",
        parameters: [paramId("id", "id du match"), paramId("joueurId", "id du joueur")],
        responses: { "200": succes("Stat supprimee"), "403": ref("AccesRefuse"), "404": ref("Introuvable") },
      },
    },

    // ============ JOUEUR (routes "moi") ============
    "/joueurs/moi": {
      get: {
        tags: ["Joueur"],
        summary: "Profil complet du joueur connecte (idKoko, nom, avatar...)",
        responses: { "200": succes("Profil"), "404": ref("Introuvable") },
      },
    },
    "/joueurs/moi/equipes": {
      get: {
        tags: ["Joueur"],
        summary: "Equipes ou le joueur connecte est/a ete inscrit",
        responses: { "200": succes("Liste") },
      },
    },
    "/joueurs/moi/matchs": {
      get: {
        tags: ["Joueur"],
        summary: "Calendrier des matchs de sa propre equipe pour un tournoi (?tournoiId= obligatoire)",
        responses: { "200": succes("Liste"), "400": { description: "tournoiId requis" }, "404": ref("Introuvable") },
      },
    },
    "/joueurs/moi/avatar": {
      put: {
        tags: ["Joueur"],
        summary: "Upload son propre avatar (multipart/form-data, champ 'avatar', max 3 Mo, jpeg/png/webp)",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: { type: "object", properties: { avatar: { type: "string", format: "binary" } } },
            },
          },
        },
        responses: {
          "200": succes("Avatar enregistre, ancien fichier supprime"),
          "400": { description: "Fichier invalide, trop volumineux, ou aucun fichier envoye" },
          "429": ref("TropDeRequetes"),
        },
      },
    },
  },
};
