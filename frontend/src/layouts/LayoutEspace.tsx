import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { NavLink, Outlet } from 'react-router'
import { FondMotif } from '../components/FondMotif'
import { BoutonRafraichir } from '../components/ui/BoutonRafraichir'
import { useDeconnexion, useSession } from '../features/auth/session'
import { useEffetDirectionnel } from '../hooks/useEffetDirectionnel'
import { useMotifFond } from '../hooks/useMotifFond'
import { useTheme } from '../hooks/useTheme'
import type { Role } from '../types/api'
import { Logo } from './Logo'
import { MenuCompte } from './MenuCompte'
import { NAVIGATION_PAR_ROLE } from './navigation'

const LIBELLE_ESPACE: Record<Role, string> = {
  ADMIN: 'Administration',
  ORGANISATEUR: 'Organisateur',
  JOUEUR: 'Joueur',
}

// Remplissage directionnel (voir useEffetDirectionnel + styles/index.css) :
// le lien devine par quel cote le curseur est entre et etend le
// remplissage depuis la. span interne "relative z-10" : sans ca, le texte
// resterait peint sous le calque de remplissage.
function LienNavigation({ chemin, libelle }: { chemin: string; libelle: string }) {
  const directionnel = useEffetDirectionnel<HTMLAnchorElement>()
  return (
    <NavLink
      ref={directionnel}
      to={chemin}
      end
      className={({ isActive }) =>
        `effet-remplissage-directionnel rounded-md px-2 py-1.5 text-base transition-colors duration-150 ${
          isActive ? 'bg-elevated text-primary-text' : 'text-text-mute hover:text-text'
        }`
      }
    >
      <span className="relative z-10">{libelle}</span>
    </NavLink>
  )
}

// Mise en page commune aux trois espaces, desktop-first : une bande
// pleine largeur tout en haut (logo + rafraichir), AU-DESSUS de tout —
// sidebar comprise, comme la barre d'ecole de reference (logo dans une
// bande distincte du fond, jamais dans la colonne de navigation elle-meme.
// Sous cette bande : sidebar a gauche (navigation, puis compte + theme +
// deconnexion tout en bas), contenu a droite.
export function LayoutEspace() {
  const { data: session } = useSession()
  const deconnexion = useDeconnexion()
  const { theme, changerTheme } = useTheme()
  const { motif, changerMotif } = useMotifFond()
  const queryClient = useQueryClient()
  // Nombre de requetes actuellement en cours, tous ecrans confondus : sur
  // une page donnee, "actuellement en cours" = les requetes DE CETTE page
  // (les autres ne sont pas montees). Rafraichir relance uniquement les
  // requetes actives, jamais tout le cache.
  const nombreEnCours = useIsFetching()

  // Garanti par GardeRole ; filet de securite pour TypeScript.
  if (!session) return null

  return (
    // h-screen + overflow-hidden : le DOCUMENT ne defile jamais. Seul
    // <main> plus bas a son propre defilement — la sidebar (et l'en-tete)
    // restent donc a l'ecran quel que soit le contenu, jamais entraines
    // vers le bas avec la page (ce que "min-h-screen" seul autorisait :
    // une page plus haute que l'ecran faisait defiler TOUT, sidebar comprise).
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Premier enfant, sans z-index : peint sous tout le reste par ordre
          du DOM. Le fond principal SEULEMENT — jamais sur les cartes/
          surfaces, deja opaques (bg-surface/bg-elevated) par-dessus, ni
          sur la bande du haut ci-dessous (elle aussi opaque). */}
      <FondMotif motif={motif} />

      {/* Bande pleine largeur : bg-elevated (plus contrastee que bg-surface,
          pour ne pas se fondre visuellement dans le fond en dessous) et
          au-dessus de la sidebar, pas a cote d'elle. */}
      <header className="flex h-20 shrink-0 items-center justify-between border-b border-border bg-elevated px-6">
        <div className="flex flex-col">
          <Logo cheminAccueil={NAVIGATION_PAR_ROLE[session.role][0].chemin} />
          <p className="mt-1.5 px-0.5 text-2xs tracking-[0.08em] text-text-mute uppercase">
            {LIBELLE_ESPACE[session.role]}
          </p>
        </div>
        <BoutonRafraichir
          enCours={nombreEnCours > 0}
          onRafraichir={() => queryClient.refetchQueries({ type: 'active' })}
        />
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="relative flex w-60 shrink-0 flex-col border-r border-border bg-surface px-4 py-6">
          <nav className="flex flex-col gap-1" aria-label="Navigation principale">
            {NAVIGATION_PAR_ROLE[session.role].map((entree) => (
              <LienNavigation key={entree.chemin} chemin={entree.chemin} libelle={entree.libelle} />
            ))}
          </nav>

          <MenuCompte
            session={session}
            theme={theme}
            onChangerTheme={changerTheme}
            motif={motif}
            onChangerMotif={changerMotif}
            onDeconnexion={() => deconnexion.mutate()}
            deconnexionEnCours={deconnexion.isPending}
          />
        </aside>

        <main className="flex-1 overflow-y-auto px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
