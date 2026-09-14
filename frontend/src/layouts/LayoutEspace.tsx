import { NavLink, Outlet } from 'react-router'
import { Bouton } from '../components/ui/Bouton'
import { ACCUEIL_PAR_ROLE, useDeconnexion, useSession } from '../features/auth/session'
import { useTheme } from '../hooks/useTheme'
import { estTheme, THEMES } from '../theme/theme'
import type { Role } from '../types/api'

const LIBELLE_ESPACE: Record<Role, string> = {
  ADMIN: 'Administration',
  ORGANISATEUR: 'Organisateur',
  JOUEUR: 'Joueur',
}

// Mise en page commune aux trois espaces, desktop-first : sidebar a
// gauche, en-tete (theme, identite, deconnexion), contenu a droite.
// La navigation ne contient que "Accueil" : les sections arrivent avec
// leurs ecrans.
export function LayoutEspace() {
  const { data: session } = useSession()
  const deconnexion = useDeconnexion()
  const { theme, changerTheme } = useTheme()

  // Garanti par GardeRole ; filet de securite pour TypeScript.
  if (!session) return null

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface px-4 py-6">
        <p className="px-2 text-lg font-medium">KOKO</p>
        <p className="px-2 text-2xs tracking-[0.08em] text-text-mute uppercase">
          {LIBELLE_ESPACE[session.role]}
        </p>

        <nav className="mt-8 flex flex-col gap-1" aria-label="Navigation principale">
          <NavLink
            to={ACCUEIL_PAR_ROLE[session.role]}
            end
            className={({ isActive }) =>
              `rounded-md px-2 py-1.5 text-sm transition-colors duration-150 ${
                isActive ? 'bg-elevated text-primary-text' : 'text-text-mute hover:text-text'
              }`
            }
          >
            Accueil
          </NavLink>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-6 border-b border-border px-8 py-3">
          <label className="flex items-center gap-2 text-sm text-text-mute">
            Thème
            <select
              value={theme}
              onChange={(e) => {
                if (estTheme(e.target.value)) changerTheme(e.target.value)
              }}
              className="rounded-md border border-border bg-elevated px-2 py-1 text-sm text-text"
            >
              {THEMES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.libelle}
                </option>
              ))}
            </select>
          </label>

          <span className="text-sm">
            {session.prenom} {session.nom}
          </span>

          <Bouton variante="secondaire" onClick={() => deconnexion.mutate()} disabled={deconnexion.isPending}>
            Se déconnecter
          </Bouton>
        </header>

        <main className="flex-1 px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
