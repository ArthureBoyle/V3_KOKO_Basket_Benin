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

// Statuts RECALCULES par le backend a chaque lecture (jamais le statut
// brut de la base) : c'est toujours ceux-la qu'on affiche.
export type StatutTournoi = 'A_VENIR' | 'ACTIF' | 'TERMINE' | 'ANNULE'
export type StatutMatch = 'A_VENIR' | 'EN_RETARD' | 'REPORTE' | 'TERMINE' | 'ANNULE'
