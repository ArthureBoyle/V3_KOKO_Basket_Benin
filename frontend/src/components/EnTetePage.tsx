import type { ReactNode } from 'react'

interface EnTetePageProps {
  titre: string
  description?: ReactNode
  // Boutons a droite du titre (creer, rafraichir...).
  actions?: ReactNode
}

export function EnTetePage({ titre, description, actions }: EnTetePageProps) {
  return (
    <div className="mb-8 flex items-start justify-between gap-6">
      <div className="min-w-0">
        <h1 className="text-3xl font-medium">{titre}</h1>
        {description && <p className="mt-2 text-text-mute">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  )
}
