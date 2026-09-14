import { useState, type FormEvent, type ReactNode } from 'react'
import { ApiError } from '../../api/client'
import { messageErreurApi } from '../../lib/erreurs'
import { Bouton } from './Bouton'
import { Champ } from './Champ'
import { Dialogue } from './Dialogue'

interface DialogueCodeAdminProps {
  ouvert: boolean
  onFermer: () => void
  titre: string
  description?: ReactNode
  libelleConfirmation: string
  // Recoit le code tape ; l'appelant l'ajoute au corps de la requete
  // (champ codeAdmin). Si la promesse echoue, l'erreur s'affiche ici.
  onConfirmer: (codeAdmin: string) => Promise<unknown>
}

// Messages propres au code secret (backend : middlewares/verifierCodeAdmin
// et limiteurCodeAdmin). Tout autre refus garde le message du backend.
function messageErreurCode(erreur: unknown): string {
  if (erreur instanceof ApiError) {
    if (erreur.status === 429) return 'Trop de codes refusés : actions protégées bloquées pendant 15 minutes.'
    if (erreur.status === 403 && erreur.message === 'Code admin invalide') return 'Code secret incorrect.'
    if (erreur.status === 403 && erreur.message.startsWith('Aucun code admin')) {
      return "Aucun code secret n'est défini sur ton compte : lance scripts/definir-code-admin.ts sur le serveur."
    }
  }
  return messageErreurApi(erreur)
}

// Confirmation des 4 actions protegees (nouveau mot de passe, email reel,
// desactivation, reattribution). Le code n'est garde que le temps de la
// saisie : efface a chaque echec et a la fermeture.
export function DialogueCodeAdmin({
  ouvert,
  onFermer,
  titre,
  description,
  libelleConfirmation,
  onConfirmer,
}: DialogueCodeAdminProps) {
  const [code, setCode] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  const fermer = () => {
    setCode('')
    setErreur(null)
    onFermer()
  }

  const confirmer = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    setEnCours(true)
    setErreur(null)
    try {
      await onConfirmer(code)
      fermer()
    } catch (refus) {
      setErreur(messageErreurCode(refus))
      setCode('')
    } finally {
      setEnCours(false)
    }
  }

  return (
    <Dialogue ouvert={ouvert} onFermer={fermer} titre={titre} description={description} fermetureBloquee={enCours}>
      <form onSubmit={confirmer} className="flex flex-col gap-5">
        <Champ
          libelle="Code secret admin"
          type="password"
          autoComplete="off"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          erreur={erreur ?? undefined}
        />
        <div className="flex justify-end gap-3">
          <Bouton variante="secondaire" onClick={fermer} disabled={enCours}>
            Annuler
          </Bouton>
          <Bouton type="submit" disabled={enCours || code.length === 0}>
            {enCours ? 'Vérification…' : libelleConfirmation}
          </Bouton>
        </div>
      </form>
    </Dialogue>
  )
}
