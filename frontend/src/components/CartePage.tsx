import type { ReactNode } from 'react'

// Panneau qui porte le contenu d'une page entiere (en-tete + onglets +
// liste...) : fond opaque, donc le motif de fond de la page (FondMotif)
// ne traverse JAMAIS ce contenu — la regle du motif ("jamais sur les
// cartes") appliquee au niveau de la page, pas seulement de la sidebar.
// Pas de backdrop-filter (couteux, exclu du motion system) : juste un
// fond plein, comme toutes les autres cartes de l'appli.
export function CartePage({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-border bg-surface p-6">{children}</div>
}
