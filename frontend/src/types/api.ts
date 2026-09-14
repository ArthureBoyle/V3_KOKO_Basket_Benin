// ================================================
// TYPES API — recopies de ce que le backend renvoie REELLEMENT (le
// backend fait foi). Ecrits a la main : la doc Swagger decrit les corps
// envoyes, pas les reponses. A completer ecran par ecran.
// ================================================

// Enveloppe de TOUTES les reponses (backend/src/utils/reponses.ts).
export type ReponseApi<T> = { success: true; data: T } | { success: false; error: string }

export type Role = 'ADMIN' | 'ORGANISATEUR' | 'JOUEUR'

// GET /auth/moi
export interface Utilisateur {
  id: number
  email: string
  role: Role
  nom: string
  prenom: string
  actif: boolean
}

// POST /auth/login
export interface ReponseConnexion {
  id: number
  role: Role
  nom: string
  prenom: string
}

export interface Identifiants {
  email: string
  motDePasse: string
}
