import { useState, type ReactNode } from 'react'
import { Bouton } from './Bouton'
import { Dialogue } from './Dialogue'
import { messageErreurApi } from '../../lib/erreurs'

interface Props {
  ouvert: boolean
  onFermer: () => void
  titre: string
  description?: ReactNode
  libelleConfirmation: string
  // dangereux : bouton de confirmation en rouge (annuler un match, une
  // action qui defait quelque chose) plutot que la couleur primaire
  // habituelle (reporter, une action neutre qui bloque juste une date).
  dangereux?: boolean
  onConfirmer: () => Promise<unknown>
}

// Confirmation generique (jamais window.confirm — ni le style ni le
// blocage synchrone du navigateur ne correspondent au reste de l'appli) :
// pour une action definitive en un clic (reporter/annuler un match...)
// qui n'a pas besoin d'un champ de saisie, contrairement a
// DialogueCodeAdmin (code secret) ou aux formulaires dedies.
export function DialogueConfirmation({
  ouvert,
  onFermer,
  titre,
  description,
  libelleConfirmation,
  dangereux = false,
  onConfirmer,
}: Props) {
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  const fermer = () => {
    setErreur(null)
    onFermer()
  }

  const confirmer = async () => {
    setEnCours(true)
    setErreur(null)
    try {
      await onConfirmer()
      fermer()
    } catch (refus) {
      setErreur(messageErreurApi(refus))
    } finally {
      setEnCours(false)
    }
  }

  return (
    <Dialogue ouvert={ouvert} onFermer={fermer} titre={titre} description={description} fermetureBloquee={enCours}>
      <div className="flex flex-col gap-5">
        {erreur && (
          <p role="alert" className="text-sm text-danger">
            {erreur}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Bouton variante="secondaire" onClick={fermer} disabled={enCours}>
            Annuler
          </Bouton>
          {dangereux ? (
            // Bouton ecrit a la main plutot que Bouton+className : les
            // deux classes de fond (bg-primary du variant, bg-danger
            // voulu ici) auraient la meme specificite CSS, l'ordre de
            // priorite entre les deux n'est pas garanti de facon fiable.
            <button
              type="button"
              onClick={confirmer}
              disabled={enCours}
              className="inline-flex items-center justify-center rounded-md bg-danger px-4 py-2 text-sm font-medium text-on-primary transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enCours ? 'Un instant…' : libelleConfirmation}
            </button>
          ) : (
            <Bouton type="button" onClick={confirmer} disabled={enCours}>
              {enCours ? 'Un instant…' : libelleConfirmation}
            </Bouton>
          )}
        </div>
      </div>
    </Dialogue>
  )
}
