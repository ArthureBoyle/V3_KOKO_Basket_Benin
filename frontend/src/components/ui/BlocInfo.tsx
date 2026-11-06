import type { ReactNode } from 'react'

// Petit bloc etiquete (libelle en capitales + valeur) : brique commune des
// cartes de tournoi mobile (joueur et organisateur).
export function BlocInfo({ libelle, children }: { libelle: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-elevated px-3 py-2.5">
      <p className="text-2xs font-medium tracking-[0.08em] text-text-mute uppercase">{libelle}</p>
      <div className="mt-1 text-sm font-medium break-words">{children}</div>
    </div>
  )
}
