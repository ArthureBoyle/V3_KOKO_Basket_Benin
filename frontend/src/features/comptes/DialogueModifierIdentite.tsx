import { useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { useNotifier } from '../../components/notifications/contexte'
import { Bouton } from '../../components/ui/Bouton'
import { Champ, ChampJour } from '../../components/ui/Champ'
import { Dialogue } from '../../components/ui/Dialogue'
import { messageErreurApi } from '../../lib/erreurs'
import { isoVersJour } from '../../lib/format'
import type { CompteDetail } from '../../types/api'
import { useModifierCompte, useModifierEmailReel } from './api'

const AUJOURDHUI = new Date().toISOString().slice(0, 10)
const DATE_MIN = '1900-01-01'

// Meme regle que verifierCodeAdmin cote backend : messages propres au code
// secret, tout le reste garde le message du backend (voir DialogueCodeAdmin).
function messageErreurCode(erreur: unknown): string {
  if (erreur instanceof ApiError) {
    if (erreur.status === 429) return 'Trop de codes refusés : réessaie dans 15 minutes.'
    if (erreur.status === 403 && erreur.message === 'Code admin invalide') return 'Code secret incorrect.'
  }
  return messageErreurApi(erreur)
}

interface Props {
  compte: CompteDetail
  ouvert: boolean
  onFermer: () => void
}

// Fusionne 2 requetes dans UN dialogue : PUT /comptes/:id (identite, sans
// code) et PUT /comptes/:id/email-reel (protege par code). Le champ code
// n'apparait que si l'email reel a ete modifie — seul cas ou le backend
// l'exige, inutile de le demander pour un simple changement de nom.
// Surnom/dateNaissance seulement pour un joueur (le backend refuse ces
// champs pour un organisateur — voir modifierCompteSchema).
export function DialogueModifierIdentite({ compte, ouvert, onFermer }: Props) {
  const [nom, setNom] = useState(compte.nom)
  const [prenom, setPrenom] = useState(compte.prenom)
  const [surnom, setSurnom] = useState(compte.joueur?.surnom ?? '')
  const [dateNaissance, setDateNaissance] = useState(
    compte.joueur ? isoVersJour(compte.joueur.dateNaissance) : '',
  )
  const [emailReel, setEmailReel] = useState(compte.emailReel ?? '')
  const [codeAdmin, setCodeAdmin] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [erreurCode, setErreurCode] = useState<string | null>(null)
  const modifier = useModifierCompte(compte.id)
  const modifierEmail = useModifierEmailReel(compte.id)
  const notifier = useNotifier()

  const emailModifie = emailReel !== (compte.emailReel ?? '')
  const enCours = modifier.isPending || modifierEmail.isPending

  // Reinitialise a la fermeture, meme idiome que DialogueCreerOrganisateur :
  // compte est stable pendant toute la vie de ce dialogue (une fiche = un
  // seul compte), reinitialiser a la fermeture equivaut a le faire a
  // l'ouverture, sans useEffect.
  const fermer = () => {
    setNom(compte.nom)
    setPrenom(compte.prenom)
    setSurnom(compte.joueur?.surnom ?? '')
    setDateNaissance(compte.joueur ? isoVersJour(compte.joueur.dateNaissance) : '')
    setEmailReel(compte.emailReel ?? '')
    setCodeAdmin('')
    setErreur(null)
    setErreurCode(null)
    onFermer()
  }

  const soumettre = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    setErreur(null)
    setErreurCode(null)
    try {
      await modifier.mutateAsync({
        nom,
        prenom,
        ...(compte.joueur ? { surnom: surnom.trim() === '' ? null : surnom, dateNaissance } : {}),
      })
    } catch (refus) {
      setErreur(messageErreurApi(refus))
      return
    }
    if (emailModifie) {
      try {
        await modifierEmail.mutateAsync({ emailReel, codeAdmin })
      } catch (refus) {
        setErreurCode(messageErreurCode(refus))
        setCodeAdmin('')
        return
      }
    }
    notifier('Compte modifié', 'succes')
    fermer()
  }

  return (
    <Dialogue ouvert={ouvert} onFermer={fermer} titre="Modifier l'identité" fermetureBloquee={enCours}>
      <form onSubmit={soumettre} className="flex flex-col gap-5">
        <Champ libelle="Nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
        <Champ libelle="Prénom" required value={prenom} onChange={(e) => setPrenom(e.target.value)} />
        {compte.joueur && (
          <>
            <Champ
              libelle="Surnom"
              placeholder="Aucun"
              aide="Laisse vide pour effacer le surnom"
              value={surnom}
              onChange={(e) => setSurnom(e.target.value)}
            />
            <ChampJour
              libelle="Date de naissance"
              required
              min={DATE_MIN}
              max={AUJOURDHUI}
              value={dateNaissance}
              onChange={(e) => setDateNaissance(e.target.value)}
            />
          </>
        )}
        <Champ
          libelle="Email réel"
          type="email"
          required
          aide="Pour le contacter hors application"
          value={emailReel}
          onChange={(e) => setEmailReel(e.target.value)}
        />
        {emailModifie && (
          <Champ
            libelle="Code secret admin"
            type="password"
            autoComplete="off"
            required
            aide="Exigé car l'email réel a été modifié"
            value={codeAdmin}
            onChange={(e) => setCodeAdmin(e.target.value)}
            erreur={erreurCode ?? undefined}
          />
        )}
        {erreur && (
          <p role="alert" className="text-sm text-danger">
            {erreur}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Bouton variante="secondaire" onClick={fermer} disabled={enCours}>
            Annuler
          </Bouton>
          <Bouton type="submit" disabled={enCours || (emailModifie && codeAdmin.length === 0)}>
            {enCours ? 'Enregistrement…' : 'Enregistrer'}
          </Bouton>
        </div>
      </form>
    </Dialogue>
  )
}
