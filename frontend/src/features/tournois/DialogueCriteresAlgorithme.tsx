import { Dialogue } from '../../components/ui/Dialogue'
import type { AlgorithmeClassement } from '../../types/api'
import { champsComptantPourLeClassement, LIBELLES_ALGORITHME } from './constantes'

interface Props {
  ouvert: boolean
  onFermer: () => void
  algorithme: AlgorithmeClassement
}

function LigneCritere({ libelle, compte, note }: { libelle: string; compte: boolean; note?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-elevated px-4 py-3">
      <div>
        <p className={`font-medium ${compte ? '' : 'text-text-mute'}`}>{libelle}</p>
        {note && <p className="mt-0.5 text-xs text-text-mute">{note}</p>}
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-2xs font-medium tracking-wide uppercase ${
          compte ? 'bg-primary-text/12 text-primary-text' : 'bg-border/40 text-text-mute'
        }`}
      >
        {compte ? 'Compte' : "N'entre pas en compte"}
      </span>
    </div>
  )
}

// "Mode vision" : quels champs de Stat entrent REELLEMENT dans le score
// affiche au Classement pour CE tournoi, selon son algorithme actuel
// (voir champsComptantPourLeClassement, source unique partagee avec la
// saisie de stats). Accessible a l'ADMIN et a l'ORGANISATEUR — l'un
// choisit l'algorithme, l'autre doit pouvoir comprendre ce qu'il saisit
// sans avoir a le deviner.
export function DialogueCriteresAlgorithme({ ouvert, onFermer, algorithme }: Props) {
  const champs = champsComptantPourLeClassement(algorithme)
  return (
    <Dialogue
      ouvert={ouvert}
      onFermer={onFermer}
      titre="Critères de classement"
      description={`Algorithme actuel : ${LIBELLES_ALGORITHME[algorithme]}`}
    >
      <div className="flex flex-col gap-2.5">
        <LigneCritere libelle="Points" compte={champs.points} />
        <LigneCritere libelle="Fautes" compte={champs.fautes} />
        <LigneCritere libelle="Contres" compte={champs.contres} />
        <LigneCritere libelle="Minutes de jeu" compte={false} note="Historique personnel du joueur uniquement — n'entre jamais dans le classement." />
      </div>
    </Dialogue>
  )
}
