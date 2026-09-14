import { useRef, type KeyboardEvent, type ReactNode } from 'react'

export interface Onglet {
  id: string
  libelle: string
}

interface OngletsProps {
  onglets: readonly Onglet[]
  actif: string
  onChanger: (id: string) => void
  // Nom de la barre d'onglets pour les lecteurs d'ecran.
  libelle: string
}

// Onglets accessibles au clavier (motif WAI-ARIA "tabs") : fleches gauche /
// droite, Debut / Fin. Seul l'onglet actif est dans l'ordre de tabulation.
// L'etat "actif" vient de l'appelant : il peut le lier a l'URL.
export function Onglets({ onglets, actif, onChanger, libelle }: OngletsProps) {
  const boutons = useRef<Record<string, HTMLButtonElement | null>>({})

  const clavier = (evenement: KeyboardEvent<HTMLDivElement>) => {
    const index = onglets.findIndex((onglet) => onglet.id === actif)
    const cibles: Record<string, number> = {
      ArrowRight: (index + 1) % onglets.length,
      ArrowLeft: (index - 1 + onglets.length) % onglets.length,
      Home: 0,
      End: onglets.length - 1,
    }
    const cible = cibles[evenement.key]
    if (cible === undefined) return
    evenement.preventDefault()
    const id = onglets[cible].id
    onChanger(id)
    boutons.current[id]?.focus()
  }

  return (
    <div role="tablist" aria-label={libelle} onKeyDown={clavier} className="flex gap-1 border-b border-border">
      {onglets.map((onglet) => {
        const estActif = onglet.id === actif
        return (
          <button
            key={onglet.id}
            ref={(element) => {
              boutons.current[onglet.id] = element
            }}
            type="button"
            role="tab"
            id={`onglet-${onglet.id}`}
            aria-selected={estActif}
            aria-controls={`panneau-${onglet.id}`}
            tabIndex={estActif ? 0 : -1}
            onClick={() => onChanger(onglet.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors duration-150 ${
              estActif ? 'border-primary text-text' : 'border-transparent text-text-mute hover:text-text'
            }`}
          >
            {onglet.libelle}
          </button>
        )
      })}
    </div>
  )
}

export function PanneauOnglet({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`panneau-${id}`} aria-labelledby={`onglet-${id}`} tabIndex={0} className="pt-6">
      {children}
    </div>
  )
}
