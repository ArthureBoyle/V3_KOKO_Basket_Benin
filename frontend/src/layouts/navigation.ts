import type { Role } from '../types/api'

export interface EntreeNavigation {
  libelle: string
  chemin: string
  // Barre du bas mobile SEULEMENT (voir LayoutEspace) : la sidebar
  // desktop n'affiche jamais d'icone, juste le libelle.
  icone: string
}

// Sections de la sidebar par role. Une section n'est ajoutee ici que
// lorsque son ecran existe (jamais de lien vers une page vide).
export const NAVIGATION_PAR_ROLE: Record<Role, readonly EntreeNavigation[]> = {
  ADMIN: [
    { libelle: 'Accueil', chemin: '/admin', icone: '🏠' },
    { libelle: 'Comptes', chemin: '/admin/comptes', icone: '👥' },
    { libelle: 'Tournois', chemin: '/admin/tournois', icone: '🏆' },
  ],
  ORGANISATEUR: [
    { libelle: 'Accueil', chemin: '/organisateur', icone: '🏠' },
    { libelle: 'Mes tournois', chemin: '/organisateur/tournois', icone: '🏆' },
  ],
  JOUEUR: [
    { libelle: 'Accueil', chemin: '/joueur', icone: '🏠' },
    { libelle: 'Mes tournois', chemin: '/joueur/tournois', icone: '🏆' },
    { libelle: 'Profil', chemin: '/joueur/profil', icone: '👤' },
  ],
}
