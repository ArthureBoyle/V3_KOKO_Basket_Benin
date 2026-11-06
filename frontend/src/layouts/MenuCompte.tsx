import { useEffect, useRef, useState } from 'react'
import { estMotifFond, MOTIFS_FOND, type MotifFond } from '../theme/motifFond'
import { appliquerAnimationsReduitesManuel, lireAnimationsReduitesManuel } from '../theme/preferences'
import { estTheme, THEMES, type Theme } from '../theme/theme'
import type { Utilisateur } from '../types/api'

interface MenuCompteProps {
  session: Utilisateur
  theme: Theme
  onChangerTheme: (theme: Theme) => void
  motif: MotifFond
  onChangerMotif: (motif: MotifFond) => void
  onDeconnexion: () => void
  deconnexionEnCours: boolean
}

// Contenu partage entre le popover desktop (MenuCompte, ancre en bas de
// la sidebar) et la fenetre mobile (DialogueCompte, voir LayoutEspace) —
// memes reglages, deux presentations differentes autour du meme JSX.
// Liste de choix (radios) a la place d'un <select> natif : le menu
// deroulant du navigateur est clair, enorme et impossible a styler sur
// mobile. Ici chaque option est une ligne tactile, la choisie est cerclee.
function ChoixListe({
  libelle,
  options,
  valeur,
  onChoisir,
}: {
  libelle: string
  options: readonly { id: string; libelle: string }[]
  valeur: string
  onChoisir: (id: string) => void
}) {
  return (
    <div role="radiogroup" aria-label={libelle} className="flex flex-col gap-1.5 px-3 py-2">
      <p className="text-xs font-medium tracking-[0.08em] text-text-mute uppercase">{libelle}</p>
      {options.map((option) => {
        const actif = option.id === valeur
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={actif}
            onClick={() => onChoisir(option.id)}
            className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
              actif ? 'border-primary bg-elevated text-text' : 'border-border text-text-mute hover:text-text'
            }`}
          >
            {option.libelle}
            {actif && (
              <span aria-hidden="true" className="text-primary-text">
                ✓
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function ContenuMenuCompte({
  session,
  theme,
  onChangerTheme,
  motif,
  onChangerMotif,
  onDeconnexion,
  deconnexionEnCours,
  onApresAction,
}: MenuCompteProps & { onApresAction?: () => void }) {
  const [animationsReduites, setAnimationsReduites] = useState(lireAnimationsReduitesManuel)

  const basculerAnimations = () => {
    const nouvelEtat = !animationsReduites
    appliquerAnimationsReduitesManuel(nouvelEtat)
    setAnimationsReduites(nouvelEtat)
  }

  return (
    <>
      <p className="truncate px-3 py-1.5 text-xs text-text-mute">{session.email}</p>
      <div role="separator" className="my-1 border-t border-border" />

      <ChoixListe
        libelle="Thème"
        options={THEMES}
        valeur={theme}
        onChoisir={(id) => {
          if (estTheme(id)) onChangerTheme(id)
        }}
      />
      <ChoixListe
        libelle="Motif de fond"
        options={MOTIFS_FOND}
        valeur={motif}
        onChoisir={(id) => {
          if (estMotifFond(id)) onChangerMotif(id)
        }}
      />

      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={animationsReduites}
        onClick={basculerAnimations}
        className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm transition-colors duration-150 hover:bg-surface"
      >
        <span>
          Réduire les animations
          <span className="block text-xs text-text-mute">Utile sur un ordinateur peu puissant</span>
        </span>
        <span
          aria-hidden="true"
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150 ${
            animationsReduites ? 'bg-primary' : 'border border-border bg-elevated'
          }`}
        >
          <span
            className={`absolute top-0.5 size-4 rounded-full transition-[left] duration-150 ${
              animationsReduites ? 'left-4 bg-on-primary' : 'left-0.5 bg-text-mute'
            }`}
          />
        </span>
      </button>

      <div role="separator" className="my-1 border-t border-border" />
      <button
        type="button"
        role="menuitem"
        disabled={deconnexionEnCours}
        onClick={() => {
          onApresAction?.()
          onDeconnexion()
        }}
        className="w-full px-3 py-1.5 text-left text-sm text-danger transition-colors duration-150 hover:bg-surface disabled:opacity-60"
      >
        {deconnexionEnCours ? 'Déconnexion…' : 'Se déconnecter'}
      </button>
    </>
  )
}

// Bouton de compte en bas de la sidebar, qui ouvre un petit menu au-dessus
// de lui (meme emplacement que celui de Claude.ai) : identite, theme,
// reduction manuelle des animations, puis deconnexion — plutot que des
// reglages epars dans l'en-tete. DESKTOP SEULEMENT : cache sur mobile
// (voir max-md:hidden sur <aside>, LayoutEspace) — l'equivalent mobile
// est DialogueCompte, ouvert depuis l'avatar de l'en-tete.
export function MenuCompte(props: MenuCompteProps) {
  const { session } = props
  const [ouvert, setOuvert] = useState(false)
  const conteneur = useRef<HTMLDivElement>(null)
  const declencheur = useRef<HTMLButtonElement>(null)
  const initiales = `${session.prenom[0] ?? ''}${session.nom[0] ?? ''}`.toUpperCase()

  // Clic en dehors ou Echap : ferme et rend le focus au bouton declencheur,
  // comme une fenetre de dialogue (voir Dialogue.tsx).
  useEffect(() => {
    if (!ouvert) return
    const surClicExterieur = (evenement: MouseEvent) => {
      if (!conteneur.current?.contains(evenement.target as Node)) setOuvert(false)
    }
    const surEchap = (evenement: KeyboardEvent) => {
      if (evenement.key === 'Escape') {
        setOuvert(false)
        declencheur.current?.focus()
      }
    }
    document.addEventListener('mousedown', surClicExterieur)
    document.addEventListener('keydown', surEchap)
    return () => {
      document.removeEventListener('mousedown', surClicExterieur)
      document.removeEventListener('keydown', surEchap)
    }
  }, [ouvert])

  return (
    // border-t + pt-3 : separe visuellement le bouton de compte de la nav,
    // au lieu de le laisser flotter seul en bas sans rattache visuel.
    <div ref={conteneur} className="relative mt-auto border-t border-border pt-3">
      {ouvert && (
        <div
          role="menu"
          aria-label="Menu du compte"
          className="absolute bottom-full left-0 mb-2 w-full min-w-56 animate-[koko-apparition_0.3s_cubic-bezier(0.2,0.8,0.3,1)] rounded-lg border border-border bg-elevated py-1.5 shadow-lg"
        >
          <ContenuMenuCompte {...props} onApresAction={() => setOuvert(false)} />
        </div>
      )}

      <button
        ref={declencheur}
        type="button"
        aria-haspopup="menu"
        aria-expanded={ouvert}
        onClick={() => setOuvert((etat) => !etat)}
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors duration-150 hover:bg-elevated"
      >
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-on-primary"
        >
          {initiales}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">
          {session.prenom} {session.nom}
        </span>
        <span
          aria-hidden="true"
          className={`shrink-0 text-text-mute transition-transform duration-150 ${ouvert ? 'rotate-180' : ''}`}
        >
          ⌄
        </span>
      </button>
    </div>
  )
}
