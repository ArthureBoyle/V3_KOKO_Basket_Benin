import { useState, type FormEvent } from 'react'
import { Bouton } from '../../components/ui/Bouton'
import { Champ, ChampDateHeure, ChampSelect } from '../../components/ui/Champ'
import { Dialogue } from '../../components/ui/Dialogue'
import { messageErreurApi } from '../../lib/erreurs'
import type { EquipeResumeTournoi } from '../../types/api'
import { useCreerMatch } from './apiMatchs'

interface Props {
  tournoiId: number
  equipes: readonly EquipeResumeTournoi[]
  ouvert: boolean
  onFermer: () => void
}

const VIDE = { equipe1Id: '', equipe2Id: '', date: null as string | null, lieu: '', type: '', arbitre: '' }

export function DialogueCreerMatch({ tournoiId, equipes, ouvert, onFermer }: Props) {
  const [champs, setChamps] = useState(VIDE)
  const [erreur, setErreur] = useState<string | null>(null)
  const creer = useCreerMatch(tournoiId)

  const fermer = () => {
    setChamps(VIDE)
    setErreur(null)
    onFermer()
  }

  const soumettre = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    if (!champs.date) return
    setErreur(null)
    try {
      await creer.mutateAsync({
        equipe1Id: Number(champs.equipe1Id),
        equipe2Id: Number(champs.equipe2Id),
        date: champs.date,
        lieu: champs.lieu,
        type: champs.type,
        ...(champs.arbitre.trim() !== '' ? { arbitre: champs.arbitre } : {}),
      })
      fermer()
    } catch (refus) {
      setErreur(messageErreurApi(refus))
    }
  }

  const optionsEquipes = equipes.map((e) => ({ valeur: String(e.id), libelle: e.nom }))
  const optionsEquipe2 = optionsEquipes.filter((o) => o.valeur !== champs.equipe1Id)

  return (
    <Dialogue ouvert={ouvert} onFermer={fermer} titre="Créer un match" fermetureBloquee={creer.isPending}>
      <form onSubmit={soumettre} className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <ChampSelect
            libelle="Équipe 1"
            required
            value={champs.equipe1Id}
            onChange={(e) => setChamps({ ...champs, equipe1Id: e.target.value, equipe2Id: '' })}
            options={[{ valeur: '', libelle: 'Sélectionner…' }, ...optionsEquipes]}
          />
          <ChampSelect
            libelle="Équipe 2"
            required
            disabled={champs.equipe1Id === ''}
            value={champs.equipe2Id}
            onChange={(e) => setChamps({ ...champs, equipe2Id: e.target.value })}
            options={[{ valeur: '', libelle: 'Sélectionner…' }, ...optionsEquipe2]}
          />
        </div>
        <ChampDateHeure
          libelle="Date et heure"
          required
          valeurIso={champs.date}
          onChangerIso={(iso) => setChamps({ ...champs, date: iso })}
        />
        <Champ
          libelle="Lieu"
          required
          value={champs.lieu}
          onChange={(e) => setChamps({ ...champs, lieu: e.target.value })}
        />
        <Champ
          libelle="Type"
          required
          placeholder="Poule A, Quart de finale…"
          value={champs.type}
          onChange={(e) => setChamps({ ...champs, type: e.target.value })}
        />
        <Champ
          libelle="Arbitre"
          aide="Facultatif"
          value={champs.arbitre}
          onChange={(e) => setChamps({ ...champs, arbitre: e.target.value })}
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
          <Bouton type="submit" disabled={creer.isPending || !champs.date}>
            {creer.isPending ? 'Création…' : 'Créer'}
          </Bouton>
        </div>
      </form>
    </Dialogue>
  )
}
