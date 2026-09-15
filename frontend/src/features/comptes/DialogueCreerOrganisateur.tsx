import { useState, type FormEvent } from 'react'
import { useNotifier } from '../../components/notifications/contexte'
import { Bouton } from '../../components/ui/Bouton'
import { Champ } from '../../components/ui/Champ'
import { Dialogue } from '../../components/ui/Dialogue'
import { messageErreurApi } from '../../lib/erreurs'
import type { CompteOrganisateurCree } from '../../types/api'
import { useCreerOrganisateur } from './api'
import { IdentifiantsGeneres } from './IdentifiantsGeneres'

const VIDE = { nom: '', prenom: '', emailReel: '' }

export function DialogueCreerOrganisateur({ ouvert, onFermer }: { ouvert: boolean; onFermer: () => void }) {
  const [champs, setChamps] = useState(VIDE)
  const [erreur, setErreur] = useState<string | null>(null)
  const [cree, setCree] = useState<CompteOrganisateurCree | null>(null)
  const creer = useCreerOrganisateur()
  const notifier = useNotifier()

  const fermer = () => {
    setChamps(VIDE)
    setErreur(null)
    setCree(null)
    onFermer()
  }

  const soumettre = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    setErreur(null)
    try {
      const resultat = await creer.mutateAsync(champs)
      setCree(resultat)
      notifier('Organisateur créé', 'succes')
    } catch (refus) {
      setErreur(messageErreurApi(refus))
    }
  }

  return (
    <Dialogue
      ouvert={ouvert}
      onFermer={fermer}
      titre={cree ? 'Organisateur créé' : 'Créer un organisateur'}
      fermetureBloquee={creer.isPending}
    >
      {cree ? (
        <IdentifiantsGeneres
          message="Transmets ces identifiants à l'organisateur hors application : ils ne seront plus jamais affichés."
          champs={[
            { libelle: 'Email', valeur: cree.emailKoko },
            { libelle: 'Mot de passe', valeur: cree.motDePasse },
          ]}
          onFermer={fermer}
        />
      ) : (
        <form onSubmit={soumettre} className="flex flex-col gap-5">
          <Champ
            libelle="Nom"
            required
            value={champs.nom}
            onChange={(e) => setChamps({ ...champs, nom: e.target.value })}
          />
          <Champ
            libelle="Prénom"
            required
            value={champs.prenom}
            onChange={(e) => setChamps({ ...champs, prenom: e.target.value })}
          />
          <Champ
            libelle="Email réel"
            type="email"
            required
            aide="Pour le contacter hors application"
            value={champs.emailReel}
            onChange={(e) => setChamps({ ...champs, emailReel: e.target.value })}
          />
          {erreur && (
            <p role="alert" className="text-sm text-danger">
              {erreur}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Bouton variante="secondaire" onClick={fermer} disabled={creer.isPending}>
              Annuler
            </Bouton>
            <Bouton type="submit" disabled={creer.isPending}>
              {creer.isPending ? 'Création…' : 'Créer'}
            </Bouton>
          </div>
        </form>
      )}
    </Dialogue>
  )
}
