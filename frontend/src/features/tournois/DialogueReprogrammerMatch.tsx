import { useState, type FormEvent } from 'react'
import { Bouton } from '../../components/ui/Bouton'
import { ChampDateHeure } from '../../components/ui/Champ'
import { Dialogue } from '../../components/ui/Dialogue'
import { messageErreurApi } from '../../lib/erreurs'
import type { MatchTournoi } from '../../types/api'
import { useReprogrammerMatch } from './apiMatchs'

interface Props {
  match: MatchTournoi | null
  tournoiId: number
  onFermer: () => void
}

function Formulaire({ match, tournoiId, onFermer }: { match: MatchTournoi; tournoiId: number; onFermer: () => void }) {
  const [date, setDate] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const reprogrammer = useReprogrammerMatch(tournoiId)

  const soumettre = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    if (!date) return
    setErreur(null)
    try {
      await reprogrammer.mutateAsync({ matchId: match.id, nouvelleDate: date })
      onFermer()
    } catch (refus) {
      setErreur(messageErreurApi(refus))
    }
  }

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-5">
      <ChampDateHeure libelle="Nouvelle date et heure" required valeurIso={date} onChangerIso={setDate} />
      {erreur && (
        <p role="alert" className="text-sm text-danger">
          {erreur}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Bouton variante="secondaire" onClick={onFermer} disabled={reprogrammer.isPending}>
          Annuler
        </Bouton>
        <Bouton type="submit" disabled={reprogrammer.isPending || !date}>
          {reprogrammer.isPending ? 'Enregistrement…' : 'Reprogrammer'}
        </Bouton>
      </div>
    </form>
  )
}

// Un match REPORTE reste bloque tant qu'aucune nouvelle date n'est fixee
// (voir reporterMatch/reprogrammerMatch cote backend : deux actions
// separees, jamais une simple modification de date).
export function DialogueReprogrammerMatch({ match, tournoiId, onFermer }: Props) {
  return (
    <Dialogue ouvert={match !== null} onFermer={onFermer} titre="Reprogrammer le match">
      {match && <Formulaire key={match.id} match={match} tournoiId={tournoiId} onFermer={onFermer} />}
    </Dialogue>
  )
}
