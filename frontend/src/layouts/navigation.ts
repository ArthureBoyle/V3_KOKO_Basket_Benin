import type { Role } from '../types/api'

export interface EntreeNavigation {
  libelle: string
  chemin: string
}

// Sections de la sidebar par role. Une section n'est ajoutee ici que
// lorsque son ecran existe (jamais de lien vers une page vide).
export const NAVIGATION_PAR_ROLE: Record<Role, readonly EntreeNavigation[]> = {
  ADMIN: [{ libelle: 'Accueil', chemin: '/admin' }],
  ORGANISATEUR: [{ libelle: 'Accueil', chemin: '/organisateur' }],
  JOUEUR: [{ libelle: 'Accueil', chemin: '/joueur' }],
}
