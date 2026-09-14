import { createBrowserRouter } from 'react-router'
import { AccueilAdmin } from '../features/admin/AccueilAdmin'
import { PageConnexion } from '../features/auth/PageConnexion'
import { AccueilJoueur } from '../features/joueur/AccueilJoueur'
import { AccueilOrganisateur } from '../features/organisateur/AccueilOrganisateur'
import { LayoutEspace } from '../layouts/LayoutEspace'
import { GardeRole } from './GardeRole'
import { PageIntrouvable } from './PageIntrouvable'
import { RedirectionAccueil } from './RedirectionAccueil'

// Un espace par role, chacun garde par son role. Les ecrans de chaque
// espace s'ajouteront en "children" de leur espace.
export const router = createBrowserRouter([
  { path: '/', element: <RedirectionAccueil /> },
  { path: '/connexion', element: <PageConnexion /> },
  {
    path: '/admin',
    element: (
      <GardeRole role="ADMIN">
        <LayoutEspace />
      </GardeRole>
    ),
    children: [{ index: true, element: <AccueilAdmin /> }],
  },
  {
    path: '/organisateur',
    element: (
      <GardeRole role="ORGANISATEUR">
        <LayoutEspace />
      </GardeRole>
    ),
    children: [{ index: true, element: <AccueilOrganisateur /> }],
  },
  {
    path: '/joueur',
    element: (
      <GardeRole role="JOUEUR">
        <LayoutEspace />
      </GardeRole>
    ),
    children: [{ index: true, element: <AccueilJoueur /> }],
  },
  { path: '*', element: <PageIntrouvable /> },
])
