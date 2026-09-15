import { useState, type FormEvent } from 'react'
import { useNotifier } from '../../components/notifications/contexte'
import { Bouton } from '../../components/ui/Bouton'
import { Champ, ChampJour } from '../../components/ui/Champ'
import { Dialogue } from '../../components/ui/Dialogue'
import { messageErreurApi } from '../../lib/erreurs'
import type { CompteJoueurCree } from '../../types/api'
import { useCreerJoueur } from './api'
import { IdentifiantsGeneres } from './IdentifiantsGeneres'

const VIDE = { nomLegal: '', prenom: '', emailReel: '', dateNaissance: '' }
// Bornes du champ : identiques a dateNaissanceSchema du backend
// (compteValidator.ts) — jamais dans le futur, jamais avant 1900.
const AUJOURDHUI = new Date().toISOString().slice(0, 10)
const DATE_MIN = '1900-01-01'

export function DialogueCreerJoueur({ ouvert, onFermer }: { ouvert: boolean; onFermer: () => void }) {
  const [champs, setChamps] = useState(VIDE)
  const [erreur, setErreur] = useState<string | null>(null)
  const [cree, setCree] = useState<CompteJoueurCree | null>(null)
  const creer = useCreerJoueur()
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
      notifier('Joueur créé', 'succes')
    } catch (refus) {
      setErreur(messageErreurApi(refus))
    }
  }

  return (
    <Dialogue
      ouvert={ouvert}
      onFermer={fermer}
      titre={cree ? 'Joueur créé' : 'Créer un joueur'}
      fermetureBloquee={creer.isPending}
    >
      {cree ? (
        <IdentifiantsGeneres
          message="Transmets ces identifiants au joueur hors application : ils ne seront plus jamais affichés."
          champs={[
            { libelle: 'ID KOKO', valeur: cree.idKoko },
            { libelle: 'Email', valeur: cree.emailKoko },
            { libelle: 'Mot de passe', valeur: cree.motDePasse },
          ]}
          onFermer={fermer}
        />
      ) : (
        <form onSubmit={soumettre} className="flex flex-col gap-5">
          <Champ
            libelle="Nom légal"
            required
            value={champs.nomLegal}
            onChange={(e) => setChamps({ ...champs, nomLegal: e.target.value })}
          />
          <Champ
            libelle="Prénom"
            required
            value={champs.prenom}
            onChange={(e) => setChamps({ ...champs, prenom: e.target.value })}
          />
          <ChampJour
            libelle="Date de naissance"
            required
            min={DATE_MIN}
            max={AUJOURDHUI}
            aide="L'admin certifie l'âge du joueur à la création"
            value={champs.dateNaissance}
            onChange={(e) => setChamps({ ...champs, dateNaissance: e.target.value })}
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
