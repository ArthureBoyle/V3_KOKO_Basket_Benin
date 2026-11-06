import { createBrowserRouter, type RouteObject } from 'react-router'
import { AccueilAdmin } from '../features/admin/AccueilAdmin'
import { PageConnexion } from '../features/auth/PageConnexion'
import { FicheCompte } from '../features/comptes/FicheCompte'
import { ListeComptes } from '../features/comptes/ListeComptes'
import { AccueilJoueur } from '../features/joueur/AccueilJoueur'
import { FicheTournoiJoueur } from '../features/joueur/FicheTournoiJoueur'
import { ListeMesTournoisJoueur } from '../features/joueur/ListeMesTournoisJoueur'
import { PageProfilJoueur } from '../features/joueur/PageProfilJoueur'
import { AccueilOrganisateur } from '../features/organisateur/AccueilOrganisateur'
import { ListeMesTournois } from '../features/organisateur/ListeMesTournois'
import { FicheTournoi } from '../features/tournois/FicheTournoi'
import { ListeTournois } from '../features/tournois/ListeTournois'
import { LayoutEspace } from '../layouts/LayoutEspace'
import { GardeRole } from './GardeRole'
import { PageIntrouvable } from './PageIntrouvable'
import { RedirectionAccueil } from './RedirectionAccueil'
import { CHEMIN_ADMIN } from '../config/cheminAdmin'

// Catalogue des composants : developpement uniquement. Charge a la demande
// et derriere import.meta.env.DEV, il est retire du build de production.
const routesDeveloppement: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: '/catalogue',
        lazy: async () => {
          const { PageCatalogue } = await import('../features/catalogue/PageCatalogue')
          return { Component: PageCatalogue }
        },
      },
    ]
  : []

// Un espace par role, chacun garde par son role. Les ecrans de chaque
// espace s'ajouteront en "children" de leur espace.
export const router = createBrowserRouter([
  { path: '/', element: <RedirectionAccueil /> },
  { path: '/connexion', element: <PageConnexion /> },
  {
    path: CHEMIN_ADMIN,
    element: (
      <GardeRole role="ADMIN">
        <LayoutEspace />
      </GardeRole>
    ),
    children: [
      { index: true, element: <AccueilAdmin /> },
      { path: 'comptes', element: <ListeComptes /> },
      { path: 'comptes/:id', element: <FicheCompte /> },
      { path: 'tournois', element: <ListeTournois /> },
      { path: 'tournois/:id', element: <FicheTournoi /> },
    ],
  },
  {
    path: '/organisateur',
    element: (
      <GardeRole role="ORGANISATEUR">
        <LayoutEspace />
      </GardeRole>
    ),
    children: [
      { index: true, element: <AccueilOrganisateur /> },
      { path: 'tournois', element: <ListeMesTournois /> },
      { path: 'tournois/:id', element: <FicheTournoi /> },
    ],
  },
  {
    path: '/joueur',
    element: (
      <GardeRole role="JOUEUR">
        <LayoutEspace />
      </GardeRole>
    ),
    children: [
      { index: true, element: <AccueilJoueur /> },
      { path: 'tournois', element: <ListeMesTournoisJoueur /> },
      { path: 'tournois/:id', element: <FicheTournoiJoueur /> },
      { path: 'profil', element: <PageProfilJoueur /> },
    ],
  },
  ...routesDeveloppement,
  { path: '*', element: <PageIntrouvable /> },
])
