import type { ReactNode } from 'react'

interface EnTetePageProps {
  titre: string
  description?: ReactNode
  // Boutons a droite du titre (creer, rafraichir...).
  actions?: ReactNode
}

export function EnTetePage({ titre, description, actions }: EnTetePageProps) {
  return (
    <div className="mb-6">
      {/* Mobile : titre puis actions EN DESSOUS (pleine largeur) — a cote, un titre
          long ou un bouton long se marchent dessus. Desktop : cote a cote. */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-medium md:text-3xl">{titre}</h1>
          {description && <p className="mt-2 text-text-mute">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-3 max-md:[&>*]:w-full md:shrink-0">{actions}</div>}
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
