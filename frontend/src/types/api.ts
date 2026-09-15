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

// ================================================
// COMPTES (ADMIN) — GET /comptes, GET /comptes/:id, creations, actions.
// Role restreint : le backend n'y renvoie jamais de compte ADMIN.
// ================================================
export type RoleCompte = 'ORGANISATEUR' | 'JOUEUR'

export interface CompteJoueurResume {
  idKoko: string
  surnom: string | null
  dateNaissance: string
  age: number
  avatar: string | null
}

export interface CompteTournoiResume {
  id: number
  nom: string
  statut: StatutTournoi
  dateDebut: string
  dateFin: string
}

// GET /comptes — un element par joueur/organisateur.
export interface Compte {
  id: number
  email: string
  emailReel: string | null
  nom: string
  prenom: string
  role: RoleCompte
  actif: boolean
  createdAt: string
  joueur: CompteJoueurResume | null
  tournois: CompteTournoiResume[]
}

export interface InscriptionTournoiJoueur {
  tournoi: CompteTournoiResume
  equipe: { id: number; nom: string; numeroDeMaillot: number } | null
}

export interface StatsGlobalesJoueur {
  matchsJoues: number
  totalPts: number
  totalFautes: number
  totalContres: number
  totalTempsJeu: number
  moyennePts: number
  moyenneFautes: number
  moyenneContres: number
  moyenneTempsJeu: number
}

interface CompteBase {
  id: number
  email: string
  emailReel: string | null
  nom: string
  prenom: string
  role: RoleCompte
  actif: boolean
  createdAt: string
}

// GET /comptes/:id — forme differente selon le role (le backend n'envoie
// jamais "joueur" ni "statsGlobales" pour un organisateur).
export type CompteDetail =
  | (CompteBase & {
      joueur: CompteJoueurResume & { id: number }
      tournois: InscriptionTournoiJoueur[]
      statsGlobales: StatsGlobalesJoueur
    })
  | (CompteBase & { joueur: null; tournois: CompteTournoiResume[] })

export interface CreationOrganisateur {
  nom: string
  prenom: string
  emailReel: string
}

// POST /comptes/organisateur
export interface CompteOrganisateurCree {
  id: number
  emailKoko: string
  motDePasse: string
}

export interface CreationJoueur {
  nomLegal: string
  prenom: string
  emailReel: string
  dateNaissance: string // "YYYY-MM-DD"
}

// POST /comptes/joueur
export interface CompteJoueurCree {
  id: number
  idKoko: string
  emailKoko: string
  motDePasse: string
}

// PUT /comptes/:id/reinitialiser-mot-de-passe
export interface MotDePasseReinitialise {
  id: number
  emailKoko: string
  nouveauMotDePasse: string
}

// ================================================
// TOURNOIS (ADMIN) — GET /tournois, GET /tournois/:id, creation.
// ================================================
export type AlgorithmeClassement =
  | 'POINTS_BRUTS'
  | 'POINTS_PONDERES'
  | 'POINTS_PONDERES_FAUTES'
  | 'POINTS_PONDERES_FAUTES_CONTRES'

export interface OrganisateurResume {
  id: number
  nom: string
  prenom: string
}

export interface CompteursTournoi {
  equipes: number
  joueurs: number
  // Matchs dont la date est passee sans score saisi (statut EN_RETARD).
  scoresASaisir: number
}

interface TournoiBase {
  id: number
  nom: string
  lieu: string
  description: string | null
  dateDebut: string
  dateFin: string
  statut: StatutTournoi
  organisateurId: number
  licencesMax: number
  equipesMax: number
  algorithmeClassement: AlgorithmeClassement
  coefficientLissage: number
  coefficientMalusFautes: number
  coefficientBoostContres: number
  createdAt: string
}

// GET /tournois — ADMIN seulement, un element par tournoi avec ses
// compteurs (jamais stockes, recalcules a la lecture — voir backend).
export interface TournoiAdmin extends TournoiBase {
  organisateur: OrganisateurResume
  compteurs: CompteursTournoi
}

// GET /tournois/mes-tournois — ORGANISATEUR, scope automatique sur ses
// propres tournois (jamais de champ "organisateur" : c'est deja lui).
export interface TournoiOrganisateur extends TournoiBase {
  compteurs: CompteursTournoi
}

export interface EquipeResumeTournoi {
  id: number
  nom: string
}

// GET /tournois/:id — pas de compteurs (contrairement a la liste), mais
// les equipes completes : chaque onglet de la fiche (Equipes, Matchs...)
// charge ensuite ses propres donnees a la demande.
export interface TournoiDetail extends TournoiBase {
  organisateur: OrganisateurResume
  equipes: EquipeResumeTournoi[]
}

// GET /tournois/:id/joueurs — le pool de licences (TournoiJoueur), avec
// l'equipe courante du joueur si deja placee (voir onglet Equipes).
export interface JoueurPoolTournoi {
  id: number
  idKoko: string
  nomLegal: string
  prenom: string
  equipeId: number | null
}

// ================================================
// EQUIPES — GET /equipes?tournoiId=, GET /equipes/:id, creation, effectif.
// ================================================
export interface Equipe {
  id: number
  nom: string
  couleur: string // "#RRGGBB"
  logo: string | null
  tournoiId: number
}

export interface JoueurEquipeDetail {
  id: number
  joueurId: number
  numeroDeMaillot: number
  joueur: {
    id: number
    idKoko: string
    nomLegal: string
    prenom: string
  }
}

// GET /equipes/:id — contrairement a la liste, porte l'effectif complet.
export interface EquipeDetail extends Equipe {
  joueurs: JoueurEquipeDetail[]
}

export interface CreationEquipe {
  nom: string
  couleur: string
}

export interface AjoutJoueurEquipe {
  joueurId: number
  numeroDeMaillot: number
}

// ================================================
// MATCHS — GET /matchs?tournoiId=, creation, cycle de vie.
// ================================================
export interface MatchTournoi {
  id: number
  tournoiId: number
  equipe1Id: number
  equipe2Id: number
  date: string
  dateOriginale: string | null
  lieu: string
  type: string
  statut: StatutMatch
  score1: number | null
  score2: number | null
  nombreCorrectionsScore: number
  arbitre: string | null
}

export interface CreationMatch {
  equipe1Id: number
  equipe2Id: number
  date: string // instant ISO avec fuseau (voir ChampDateHeure)
  lieu: string
  type: string
  arbitre?: string
}

// ================================================
// CLASSEMENT — GET /tournois/:id/classement(-equipes). Recalcule a la
// volee par le backend, jamais stocke, jamais modifiable depuis le front.
// ================================================
export interface JoueurClasse {
  rang: number
  joueurId: number
  idKoko: string | null
  nomLegal: string | null
  prenom: string | null
  equipeId: number
  totalPts: number
  totalFautes: number
  totalContres: number
  totalTempsJeu: number
  matchsJoues: number
  score: number
  // Informatif seulement (l'algorithme lisse deja l'equite) : aide juste
  // a lire le classement, ne change jamais l'ordre.
  faibleEchantillon: boolean
}

export interface EquipeClassee {
  rang: number
  id: number
  nom: string
  couleur: string
  victoires: number
  defaites: number
  points: number
}

// ================================================
// STATS (par match) — GET/PUT/DELETE /matchs/:id/stats. Alimentent le
// classement joueurs (voir JoueurClasse) : jamais saisies avant que le
// score du match lui-meme soit renseigne.
// ================================================
export interface StatJoueurMatch {
  id: number
  matchId: number
  joueurId: number
  equipeId: number
  points: number
  fautes: number
  contres: number
  tempsJeu: number
  nombreCorrections: number
  joueur: { id: number; idKoko: string; nomLegal: string; prenom: string }
  // Present seulement pour l'ADMIN (voir getStats) : le joueur n'est
  // plus dans le pool de licences de ce tournoi, mais sa stat reste.
  retireDuTournoi?: boolean
}

export interface SaisieStat {
  equipeId: number
  points: number
  fautes: number
  contres: number
  tempsJeu: number
}

// POST /tournois
export interface CreationTournoi {
  nom: string
  lieu: string
  description?: string
  dateDebut: string
  dateFin: string
  organisateurId: number
  licencesMax: number
  equipesMax: number
}

// PUT /tournois/:id — ADMIN seulement pour dates/licences/equipes/
// classement (organisateur limite a nom/lieu/description, voir
// modifierTournoi cote backend). Pas de code secret : contrairement a
// reattribuer l'organisateur, corriger ces champs n'est pas juge sensible.
export interface ModificationTournoi {
  nom?: string
  lieu?: string
  description?: string
  dateDebut?: string
  dateFin?: string
  licencesMax?: number
  equipesMax?: number
  algorithmeClassement?: AlgorithmeClassement
  coefficientLissage?: number
  coefficientMalusFautes?: number
  coefficientBoostContres?: number
}
