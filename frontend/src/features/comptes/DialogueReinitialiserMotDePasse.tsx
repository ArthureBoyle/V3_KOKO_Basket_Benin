import { useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { useNotifier } from '../../components/notifications/contexte'
import { Bouton } from '../../components/ui/Bouton'
import { Champ } from '../../components/ui/Champ'
import { Dialogue } from '../../components/ui/Dialogue'
import { messageErreurApi } from '../../lib/erreurs'
import type { MotDePasseReinitialise } from '../../types/api'
import { useReinitialiserMotDePasse } from './api'
import { IdentifiantsGeneres } from './IdentifiantsGeneres'

function messageErreurCode(erreur: unknown): string {
  if (erreur instanceof ApiError) {
    if (erreur.status === 429) return 'Trop de codes refusés : réessaie dans 15 minutes.'
    if (erreur.status === 403 && erreur.message === 'Code admin invalide') return 'Code secret incorrect.'
  }
  return messageErreurApi(erreur)
}

interface Props {
  compteId: number
  ouvert: boolean
  onFermer: () => void
}

// Genere un nouveau mot de passe aleatoire, coupe toutes les sessions du
// compte. Meme flux en 2 temps que les creations : code d'abord, puis le
// mot de passe affiche UNE seule fois.
export function DialogueReinitialiserMotDePasse({ compteId, ouvert, onFermer }: Props) {
  const [codeAdmin, setCodeAdmin] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [resultat, setResultat] = useState<MotDePasseReinitialise | null>(null)
  const reinitialiser = useReinitialiserMotDePasse(compteId)
  const notifier = useNotifier()

  // Reinitialise a la fermeture, meme idiome que DialogueCreerOrganisateur
  // (pas de useEffect : la prochaine ouverture repart deja de cet etat).
  const fermer = () => {
    setCodeAdmin('')
    setErreur(null)
    setResultat(null)
    onFermer()
  }

  const soumettre = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    setErreur(null)
    try {
      const donnee = await reinitialiser.mutateAsync(codeAdmin)
      setResultat(donnee)
      notifier('Mot de passe réinitialisé', 'succes')
    } catch (refus) {
      setErreur(messageErreurCode(refus))
      setCodeAdmin('')
    }
  }

  return (
    <Dialogue
      ouvert={ouvert}
      onFermer={fermer}
      titre={resultat ? 'Mot de passe réinitialisé' : 'Réinitialiser le mot de passe'}
      description={
        resultat ? undefined : 'Génère un nouveau mot de passe aléatoire et coupe toutes les sessions actives du compte.'
      }
      fermetureBloquee={reinitialiser.isPending}
    >
      {resultat ? (
        <IdentifiantsGeneres
          message="Transmets ce mot de passe au titulaire du compte hors application : il ne sera plus jamais affiché."
          champs={[
            { libelle: 'Email', valeur: resultat.emailKoko },
            { libelle: 'Mot de passe', valeur: resultat.nouveauMotDePasse },
          ]}
          onFermer={fermer}
        />
      ) : (
        <form onSubmit={soumettre} className="flex flex-col gap-5">
          <Champ
            libelle="Code secret admin"
            type="password"
            autoComplete="off"
            autoFocus
            required
            value={codeAdmin}
            onChange={(e) => setCodeAdmin(e.target.value)}
            erreur={erreur ?? undefined}
          />
          <div className="flex justify-end gap-3">
            <Bouton variante="secondaire" onClick={fermer} disabled={reinitialiser.isPending}>
              Annuler
            </Bouton>
            <Bouton type="submit" disabled={reinitialiser.isPending || codeAdmin.length === 0}>
              {reinitialiser.isPending ? 'Vérification…' : 'Réinitialiser'}
            </Bouton>
          </div>
        </form>
      )}
    </Dialogue>
  )
}
