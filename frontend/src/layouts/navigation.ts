import { House, Trophy, User, Users, type LucideIcon } from 'lucide-react'
import type { Role } from '../types/api'
import { CHEMIN_ADMIN } from '../config/cheminAdmin'

export interface EntreeNavigation {
  libelle: string
  chemin: string
  // Barre du bas mobile SEULEMENT (voir LayoutEspace) : la sidebar
  // desktop n'affiche jamais d'icone, juste le libelle.
  icone: LucideIcon
}

// Sections de la sidebar par role. Une section n'est ajoutee ici que
// lorsque son ecran existe (jamais de lien vers une page vide).
export const NAVIGATION_PAR_ROLE: Record<Role, readonly EntreeNavigation[]> = {
  ADMIN: [
    { libelle: 'Accueil', chemin: CHEMIN_ADMIN, icone: House },
    { libelle: 'Comptes', chemin: `${CHEMIN_ADMIN}/comptes`, icone: Users },
    { libelle: 'Tournois', chemin: `${CHEMIN_ADMIN}/tournois`, icone: Trophy },
  ],
  ORGANISATEUR: [
    { libelle: 'Accueil', chemin: '/organisateur', icone: House },
    { libelle: 'Mes tournois', chemin: '/organisateur/tournois', icone: Trophy },
  ],
  JOUEUR: [
    { libelle: 'Accueil', chemin: '/joueur', icone: House },
    { libelle: 'Mes tournois', chemin: '/joueur/tournois', icone: Trophy },
    { libelle: 'Profil', chemin: '/joueur/profil', icone: User },
  ],
}
