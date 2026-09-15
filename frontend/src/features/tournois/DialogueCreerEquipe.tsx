import { useState, type FormEvent } from 'react'
import { Bouton } from '../../components/ui/Bouton'
import { Champ } from '../../components/ui/Champ'
import { Dialogue } from '../../components/ui/Dialogue'
import { messageErreurApi } from '../../lib/erreurs'
import { useCreerEquipe } from './apiEquipes'

// Couleur du ballon (styles/index.css, --ballon) comme point de depart :
// arbitraire mais coherent avec le reste de l'identite visuelle, jamais
// impose — l'organisateur choisit la vraie couleur du maillot ensuite.
const VIDE = { nom: '', couleur: '#d9642b' }

export function DialogueCreerEquipe({
  tournoiId,
  ouvert,
  onFermer,
}: {
  tournoiId: number
  ouvert: boolean
  onFermer: () => void
}) {
  const [champs, setChamps] = useState(VIDE)
  const [erreur, setErreur] = useState<string | null>(null)
  const creer = useCreerEquipe(tournoiId)

  const fermer = () => {
    setChamps(VIDE)
    setErreur(null)
    onFermer()
  }

  const soumettre = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    setErreur(null)
    try {
      await creer.mutateAsync(champs)
      fermer()
    } catch (refus) {
      setErreur(messageErreurApi(refus))
    }
  }

  return (
    <Dialogue ouvert={ouvert} onFermer={fermer} titre="Créer une équipe" fermetureBloquee={creer.isPending}>
      <form onSubmit={soumettre} className="flex flex-col gap-5">
        <Champ
          libelle="Nom de l'équipe"
          required
          value={champs.nom}
          onChange={(e) => setChamps({ ...champs, nom: e.target.value })}
        />
        <Champ
          libelle="Couleur"
          type="color"
          required
          className="h-11 w-20 cursor-pointer p-1"
          value={champs.couleur}
          onChange={(e) => setChamps({ ...champs, couleur: e.target.value })}
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
    </Dialogue>
  )
}
