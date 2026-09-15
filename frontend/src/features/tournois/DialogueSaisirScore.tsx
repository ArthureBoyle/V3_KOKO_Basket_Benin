import { useState, type FormEvent } from 'react'
import { Bouton } from '../../components/ui/Bouton'
import { Champ } from '../../components/ui/Champ'
import { Dialogue } from '../../components/ui/Dialogue'
import { messageErreurApi } from '../../lib/erreurs'
import type { MatchTournoi } from '../../types/api'
import { useSaisirScore } from './apiMatchs'

interface Props {
  match: MatchTournoi | null
  tournoiId: number
  nomEquipe1: string
  nomEquipe2: string
  onFermer: () => void
  // ORGANISATEUR : plafond de 3 tentatives (1 saisie + 2 corrections),
  // affiche pour lui seul — l'ADMIN est illimite et ne consomme jamais
  // ce compteur (voir saisirScore cote backend).
  estAdmin?: boolean
}

const TENTATIVES_MAX = 3

// Formulaire isole, remonte a chaque ouverture (key={match.id} plus bas +
// demontage complet quand match redevient null) : les champs partent
// TOUJOURS des vraies valeurs du match ouvert, sans useEffect de reset.
function FormulaireScore({
  match,
  nomEquipe1,
  nomEquipe2,
  tournoiId,
  onFermer,
  estAdmin,
}: {
  match: MatchTournoi
  nomEquipe1: string
  nomEquipe2: string
  tournoiId: number
  onFermer: () => void
  estAdmin: boolean
}) {
  const [score1, setScore1] = useState(match.score1 !== null ? String(match.score1) : '')
  const [score2, setScore2] = useState(match.score2 !== null ? String(match.score2) : '')
  const [erreur, setErreur] = useState<string | null>(null)
  const saisir = useSaisirScore(tournoiId)

  // 1ere saisie + 2 corrections max pour l'ORGANISATEUR (voir saisirScore
  // cote backend) : tentative sur le point d'etre faite = deja utilisees + 1.
  const dejaSaisi = match.score1 !== null && match.score2 !== null
  const tentativesUtilisees = dejaSaisi ? 1 + match.nombreCorrectionsScore : 0
  const prochaineTentative = tentativesUtilisees + 1
  const limiteAtteinte = !estAdmin && prochaineTentative > TENTATIVES_MAX

  const soumettre = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    setErreur(null)
    try {
      await saisir.mutateAsync({ matchId: match.id, score1: Number(score1), score2: Number(score2) })
      onFermer()
    } catch (refus) {
      setErreur(messageErreurApi(refus))
    }
  }

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-5">
      {!estAdmin && (
        <p className={`text-xs ${limiteAtteinte ? 'text-danger' : 'text-text-mute'}`}>
          {limiteAtteinte
            ? `Limite de ${TENTATIVES_MAX} tentatives atteinte : seul un administrateur peut corriger ce score.`
            : `Tentative ${prochaineTentative}/${TENTATIVES_MAX} (1 saisie + 2 corrections maximum).`}
        </p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Champ
          libelle={nomEquipe1}
          type="number"
          min={0}
          max={200}
          required
          disabled={limiteAtteinte}
          value={score1}
          onChange={(e) => setScore1(e.target.value)}
        />
        <Champ
          libelle={nomEquipe2}
          type="number"
          min={0}
          max={200}
          required
          disabled={limiteAtteinte}
          value={score2}
          onChange={(e) => setScore2(e.target.value)}
        />
      </div>
      {erreur && (
        <p role="alert" className="text-sm text-danger">
          {erreur}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Bouton variante="secondaire" onClick={onFermer} disabled={saisir.isPending}>
          Annuler
        </Bouton>
        <Bouton type="submit" disabled={saisir.isPending || limiteAtteinte}>
          {saisir.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </Bouton>
      </div>
    </form>
  )
}

// Correction plafonnee cote backend a 2 pour l'organisateur (1 saisie +
// 2 corrections), illimitee pour l'ADMIN — le formulaire est le meme
// dans les deux cas, seul le backend tranche (message d'erreur precis
// deja retourne tel quel par messageErreurApi).
export function DialogueSaisirScore({ match, tournoiId, nomEquipe1, nomEquipe2, onFermer, estAdmin = true }: Props) {
  const dejaSaisi = match !== null && match.score1 !== null && match.score2 !== null
  return (
    <Dialogue ouvert={match !== null} onFermer={onFermer} titre={dejaSaisi ? 'Corriger le score' : 'Saisir le score'}>
      {match && (
        <FormulaireScore
          key={match.id}
          match={match}
          nomEquipe1={nomEquipe1}
          nomEquipe2={nomEquipe2}
          tournoiId={tournoiId}
          onFermer={onFermer}
          estAdmin={estAdmin}
        />
      )}
    </Dialogue>
  )
}
