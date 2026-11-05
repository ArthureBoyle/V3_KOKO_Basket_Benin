import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { FondMotif } from '../components/FondMotif'
import { Dialogue } from '../components/ui/Dialogue'
import { BoutonRafraichir } from '../components/ui/BoutonRafraichir'
import { useDeconnexion, useSession } from '../features/auth/session'
import { useEffetDirectionnel } from '../hooks/useEffetDirectionnel'
import { useMotifFond } from '../hooks/useMotifFond'
import { useTheme } from '../hooks/useTheme'
import type { Role } from '../types/api'
import { Logo } from './Logo'
import { ContenuMenuCompte, MenuCompte } from './MenuCompte'
import { NAVIGATION_PAR_ROLE } from './navigation'

const LIBELLE_ESPACE: Record<Role, string> = {
  ADMIN: 'Administration',
  ORGANISATEUR: 'Organisateur',
  JOUEUR: 'Joueur',
}

// Remplissage directionnel (voir useEffetDirectionnel + styles/index.css) :
// le lien devine par quel cote le curseur est entre et etend le
// remplissage depuis la. span interne "relative z-10" : sans ca, le texte
// resterait peint sous le calque de remplissage. DESKTOP SEULEMENT — la
// sidebar entiere est cachee sur mobile (voir LienNavigationMobile).
function LienNavigation({ chemin, libelle }: { chemin: string; libelle: string }) {
  const directionnel = useEffetDirectionnel<HTMLAnchorElement>()
  return (
    <NavLink
      ref={directionnel}
      to={chemin}
      end
      className={({ isActive }) =>
        `effet-remplissage-directionnel rounded-md border px-3 py-2.5 text-lg transition-colors duration-150 ${
          isActive ? 'border-primary-text/40 bg-elevated text-primary-text' : 'border-border text-text-mute hover:text-text'
        }`
      }
    >
      <span className="relative z-10">{libelle}</span>
    </NavLink>
  )
}

// Onglet de la barre du bas (mobile) : icone + libelle court, empile —
// le motif natif des applications telephone (jamais une sidebar reduite
// ni un tiroir qui imite le desktop, voir la refonte de cet ecran).
function LienNavigationMobile({ chemin, libelle, icone }: { chemin: string; libelle: string; icone: string }) {
  return (
    <NavLink
      to={chemin}
      end
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-2xs font-medium ${
          isActive ? 'text-primary-text' : 'text-text-mute'
        }`
      }
    >
      <span aria-hidden="true" className="text-xl leading-none">
        {icone}
      </span>
      {libelle}
    </NavLink>
  )
}

// Mise en page commune aux trois espaces, desktop-first : une bande
// pleine largeur tout en haut (logo + rafraichir), AU-DESSUS de tout —
// sidebar comprise, comme la barre d'ecole de reference (logo dans une
// bande distincte du fond, jamais dans la colonne de navigation elle-meme.
// Sous cette bande : sidebar a gauche (navigation, puis compte + theme +
// deconnexion tout en bas), contenu a droite.
//
// Mobile (max-md:) : PAS la meme sidebar reduite a un tiroir — repense
// pour le telephone (retour explicite de l'utilisateur, "juste reduit/
// ajuste c'est vilain") avec deux patterns natifs distincts :
// - barre d'onglets fixee en bas (icone + libelle), jamais un menu
//   hamburger qui imite la nav desktop ;
// - le compte (theme, motif, deconnexion) s'ouvre depuis un avatar dans
//   l'en-tete, en fenetre modale (DialogueCompte), pas en popover ancre
//   a une sidebar qui n'existe plus sur cet ecran.
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
  const [compteMobileOuvert, setCompteMobileOuvert] = useState(false)

  // Garanti par GardeRole ; filet de securite pour TypeScript.
  if (!session) return null

  const initiales = `${session.prenom[0] ?? ''}${session.nom[0] ?? ''}`.toUpperCase()

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
      <header className="flex h-20 shrink-0 items-center justify-between border-b border-border bg-elevated px-6 max-md:px-4">
        <div className="flex items-center gap-3">
          {/* Avatar de compte : mobile seulement — ouvre DialogueCompte.
              Sur desktop, le compte reste dans MenuCompte au bas de la
              sidebar (toujours visible), cet avatar serait redondant. */}
          <button
            type="button"
            onClick={() => setCompteMobileOuvert(true)}
            aria-label="Mon compte"
            className="hidden size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-on-primary max-md:flex"
          >
            {initiales}
          </button>
          <div className="flex flex-col">
            <Logo cheminAccueil={NAVIGATION_PAR_ROLE[session.role][0].chemin} />
            <p className="mt-1.5 px-0.5 text-2xs tracking-[0.08em] text-text-mute uppercase">
              {LIBELLE_ESPACE[session.role]}
            </p>
          </div>
        </div>
        <BoutonRafraichir
          enCours={nombreEnCours > 0}
          onRafraichir={() => queryClient.refetchQueries({ type: 'active' })}
        />
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop : colonne fixe normale, toujours visible. Entierement
            cachee sur mobile (max-md:hidden) — remplacee par la barre du
            bas + l'avatar de l'en-tete, jamais par un tiroir qui la
            reduirait telle quelle. */}
        <aside className="relative flex w-60 shrink-0 flex-col bg-surface px-4 py-6 max-md:hidden">
          <nav className="flex flex-col gap-2.5" aria-label="Navigation principale">
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

          {/* Bord lumineux (meme recette que le separateur d'EnTetePage,
              tourne a la verticale) : un simple border-r plat rendait la
              sidebar terne a cote du contenu texture — cette bande la
              relie visuellement au reste sans lui ajouter de motif. */}
          <div
            aria-hidden="true"
            className="absolute inset-y-0 right-0 w-[3px] bg-gradient-to-b from-transparent via-primary to-transparent shadow-[0_0_14px_1px_color-mix(in_oklab,var(--primary)_90%,transparent)]"
          />
        </aside>

        {/* max-md:pb-20 : laisse toujours la place a la barre du bas fixe,
            sinon son dernier contenu passerait dessous. */}
        <main className="flex-1 overflow-y-auto px-8 py-8 max-md:px-4 max-md:py-5 max-md:pb-24">
          <Outlet />
        </main>
      </div>

      {/* Barre d'onglets mobile : fixee en bas, toujours a portee de
          pouce — le pattern natif de toute application telephone bien
          concue, pas une sidebar qui deviendrait un menu deroulant. */}
      <nav
        aria-label="Navigation principale"
        className="hidden max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:flex max-md:h-[4.5rem] max-md:items-stretch max-md:border-t max-md:border-border max-md:bg-elevated max-md:px-2 max-md:pb-[env(safe-area-inset-bottom,0px)]"
      >
        {NAVIGATION_PAR_ROLE[session.role].map((entree) => (
          <LienNavigationMobile key={entree.chemin} chemin={entree.chemin} libelle={entree.libelle} icone={entree.icone} />
        ))}
      </nav>

      <Dialogue ouvert={compteMobileOuvert} onFermer={() => setCompteMobileOuvert(false)} titre="Mon compte">
        <ContenuMenuCompte
          session={session}
          theme={theme}
          onChangerTheme={changerTheme}
          motif={motif}
          onChangerMotif={changerMotif}
          onDeconnexion={() => deconnexion.mutate()}
          deconnexionEnCours={deconnexion.isPending}
          onApresAction={() => setCompteMobileOuvert(false)}
        />
      </Dialogue>
    </div>
  )
}
