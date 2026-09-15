import type { ReactNode } from 'react'

interface EnTetePageProps {
  titre: string
  description?: ReactNode
  // Boutons a droite du titre (creer, rafraichir...).
  actions?: ReactNode
  // Tuile carree a gauche du titre (petite icone de page).
  icone?: ReactNode
}

export function EnTetePage({ titre, description, actions, icone }: EnTetePageProps) {
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 items-start gap-4">
          {icone && (
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-elevated">
              {icone}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-3xl font-medium">{titre}</h1>
            {description && <p className="mt-2 text-text-mute">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
      </div>

      {/* Separateur lumineux : degrade + lueur statiques (pas d'animation),
          tres bon marche (un seul repaint), jamais anime en continu.
          Version initiale (1px, sans lueur) illisible — trop fine, pas
          "lumineuse" : epaissie a 3px et la lueur vient d'un box-shadow
          flou plutot que du seul degrade, qui ne suffisait pas a lui seul. */}
      <div
        aria-hidden="true"
        className="mt-5 h-[3px] rounded-full bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_14px_1px_color-mix(in_oklab,var(--primary)_90%,transparent)]"
      />
    </div>
  )
}
