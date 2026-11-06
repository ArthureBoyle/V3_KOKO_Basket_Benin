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
  // "soulignee" (defaut) : liste de libelles, trait actif — pour un nombre
  // quelconque d'onglets secondaires (voir PageCatalogue).
  // "segmentee" : les options se partagent TOUTE la largeur a poids egal —
  // pour un petit nombre d'options qui SONT le contenu de l'ecran (ex.
  // Joueurs / Organisateurs), ou une bande fine dans un coin sous-emploie
  // l'espace et minimise des choix pourtant primaires.
  variante?: 'soulignee' | 'segmentee'
}

// Onglets accessibles au clavier (motif WAI-ARIA "tabs") : fleches gauche /
// droite, Debut / Fin. Seul l'onglet actif est dans l'ordre de tabulation.
// L'etat "actif" vient de l'appelant : il peut le lier a l'URL.
export function Onglets({ onglets, actif, onChanger, libelle, variante = 'soulignee' }: OngletsProps) {
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

  const classesConteneur =
    variante === 'segmentee'
      ? // max-md:overflow-x-auto : un tournoi a 6 onglets ("Statistiques"
        // compris) ne rentre plus a la largeur d'un telephone une fois
        // chaque bouton force a garder sa largeur naturelle (voir
        // max-md:flex-none plus bas) — la rangee defile a la place de
        // clipper silencieusement les derniers onglets.
        'flex gap-1 rounded-lg border border-border bg-elevated p-1 max-md:overflow-x-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden'
      : 'flex gap-1 border-b border-border max-md:overflow-x-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden'

  return (
    <div role="tablist" aria-label={libelle} onKeyDown={clavier} className={classesConteneur}>
      {onglets.map((onglet) => {
        const estActif = onglet.id === actif
        const classes =
          variante === 'segmentee'
            ? `flex-1 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-150 ${
                // 4 onglets ou plus : largeur naturelle + defilement sur mobile.
                // 3 ou moins : ils se partagent toute la largeur, meme sur mobile.
                onglets.length > 3 ? 'max-md:flex-none' : ''
              } ${
                estActif ? 'bg-primary text-on-primary' : 'text-text-mute hover:text-text'
              }`
            : `-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors duration-150 ${
                estActif ? 'border-primary text-text' : 'border-transparent text-text-mute hover:text-text'
              }`
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
            className={classes}
          >
            {onglet.libelle}
          </button>
        )
      })}
    </div>
  )
}

export function PanneauOnglet({ id, children }: { id: string; children: ReactNode }) {
  // Pas de tabIndex ici : un conteneur de bloc focusable produisait un
  // grand cadre de focus autour de tout le panneau au clavier. Son contenu
  // (champs, tableau...) reste normalement atteignable au clavier.
  return (
    <div role="tabpanel" id={`panneau-${id}`} aria-labelledby={`onglet-${id}`} className="pt-6">
      {children}
    </div>
  )
}
