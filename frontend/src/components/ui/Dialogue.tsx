import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

interface DialogueProps {
  ouvert: boolean
  onFermer: () => void
  titre: string
  description?: ReactNode
  children?: ReactNode
  // Empeche Echap / clic a cote de fermer (ex. pendant une requete).
  fermetureBloquee?: boolean
}

// <dialog> natif ouvert avec showModal() : le navigateur rend deja le reste
// de la page inerte, gere la touche Echap, place le focus dans la fenetre
// et le rend a l'element d'origine a la fermeture. Aucune librairie.
export function Dialogue({ ouvert, onFermer, titre, description, children, fermetureBloquee = false }: DialogueProps) {
  const reference = useRef<HTMLDialogElement>(null)
  const idTitre = useId()
  const idDescription = useId()

  useEffect(() => {
    const dialogue = reference.current
    if (!dialogue) return
    if (ouvert && !dialogue.open) dialogue.showModal()
    if (!ouvert && dialogue.open) dialogue.close()
  }, [ouvert])

  return (
    <dialog
      ref={reference}
      aria-labelledby={idTitre}
      aria-describedby={description ? idDescription : undefined}
      onCancel={(evenement) => {
        // Echap : on garde la main sur l'etat "ouvert" cote React.
        evenement.preventDefault()
        if (!fermetureBloquee) onFermer()
      }}
      onClick={(evenement) => {
        // Clic sur le fond (hors du contenu) : ferme.
        if (evenement.target === evenement.currentTarget && !fermetureBloquee) onFermer()
      }}
      className="dialogue m-auto w-full max-w-md rounded-xl border border-border bg-surface p-0 text-text backdrop:bg-black/60"
    >
      <div className="px-6 pb-6">
        {/* Titre + bouton fermer, colles en haut quand le contenu defile :
            sur mobile, le fond cliquable est presque invisible, il faut un
            vrai moyen de fermer toujours a portee de pouce. */}
        <div className="sticky top-0 z-10 -mx-6 flex items-start justify-between gap-3 bg-surface px-6 pt-6 pb-2">
          <h2 id={idTitre} className="text-xl font-medium">
            {titre}
          </h2>
          {!fermetureBloquee && (
            <button
              type="button"
              onClick={onFermer}
              aria-label="Fermer"
              className="-mt-1 -mr-2 flex size-9 shrink-0 items-center justify-center rounded-md text-text-mute transition-colors duration-150 hover:bg-elevated hover:text-text"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          )}
        </div>
        {description && (
          <div id={idDescription} className="mt-2 text-sm text-text-mute">
            {description}
          </div>
        )}
        {children && <div className="mt-5">{children}</div>}
      </div>
    </dialog>
  )
}
