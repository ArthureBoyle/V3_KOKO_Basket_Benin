import type { ReactNode } from 'react'
import { Ballon } from './Ballon'

interface EtatVideProps {
  titre: string
  description?: ReactNode
  action?: ReactNode
}

// Liste vide : un message et, si possible, l'action qui la remplit.
// Ballon en rotation lente et opacite reduite (motion system, recapitulatif).
export function EtatVide({ titre, description, action }: EtatVideProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-8 py-12 text-center">
      <Ballon mode="lent" className="size-10 opacity-50" />
      <p className="text-base font-medium">{titre}</p>
      {description && <p className="max-w-md text-sm text-text-mute">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
