import { Dialogue } from '../../components/ui/Dialogue'
import type { MatchTournoi } from '../../types/api'

interface Props {
  match: MatchTournoi | null
  estAdmin: boolean
  onFermer: () => void
  onSaisirScore: () => void
  onReporter: () => void
  onReprogrammer: () => void
  onAnnuler: () => void
  onReactiver: () => void
}

const TENTATIVES_MAX = 3

function LigneAction({
  libelle,
  description,
  disponible,
  dangereux = false,
  onClick,
}: {
  libelle: string
  description: string
  disponible: boolean
  dangereux?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!disponible}
      className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors duration-150 disabled:cursor-not-allowed ${
        !disponible
          ? 'border-border/50 bg-elevated/40 opacity-50'
          : dangereux
            ? 'border-danger/30 bg-danger/12 hover:bg-danger/20'
            : 'border-border bg-elevated hover:border-primary'
      }`}
    >
      <div>
        <p className={`font-medium ${disponible && dangereux ? 'text-danger' : ''}`}>{libelle}</p>
        <p className="mt-0.5 text-xs text-text-mute">{description}</p>
      </div>
    </button>
  )
}

// Un seul point d'entree ("Gerer") plutot qu'une rangee de boutons dont
// le NOMBRE change selon le statut du match : d'une carte a l'autre, la
// meme action se retrouvait a une position differente (ou disparaissait),
// une incoherence visuelle. Ici, TOUJOURS les memes lignes dans le meme
// ordre, seule leur disponibilite change — on sait toujours ou chercher,
// meme quand une action n'est pas possible en ce moment.
export function DialogueGererMatch({
  match,
  estAdmin,
  onFermer,
  onSaisirScore,
  onReporter,
  onReprogrammer,
  onAnnuler,
  onReactiver,
}: Props) {
  if (!match) {
    return <Dialogue ouvert={false} onFermer={onFermer} titre="Gérer ce match" />
  }

  const dejaSaisi = match.score1 !== null && match.score2 !== null
  const tentativesUtilisees = dejaSaisi ? 1 + match.nombreCorrectionsScore : 0
  const limiteAtteinte = !estAdmin && tentativesUtilisees >= TENTATIVES_MAX
  const tentativesRestantes = TENTATIVES_MAX - tentativesUtilisees

  const descriptionScore = limiteAtteinte
    ? `Limite de ${TENTATIVES_MAX} tentatives atteinte : seul un administrateur peut encore corriger.`
    : !estAdmin
      ? `Tentative ${tentativesUtilisees + 1}/${TENTATIVES_MAX} — il te reste ${tentativesRestantes} tentative${tentativesRestantes > 1 ? 's' : ''} (1 saisie + 2 corrections maximum).`
      : dejaSaisi
        ? 'Corrections illimitées pour un administrateur.'
        : 'Score pas encore saisi.'

  const actions: { libelle: string; description: string; disponible: boolean; dangereux?: boolean; onClick: () => void }[] = [
    {
      libelle: dejaSaisi ? 'Corriger le score' : 'Saisir le score',
      description: descriptionScore,
      disponible: match.statut !== 'ANNULE' && match.statut !== 'REPORTE' && !limiteAtteinte,
      onClick: onSaisirScore,
    },
    {
      libelle: 'Reporter',
      description:
        match.statut === 'A_VENIR' || match.statut === 'EN_RETARD'
          ? "Passe en reporté ; la date d'origine reste enregistrée."
          : 'Disponible seulement avant que le match soit joué.',
      disponible: match.statut === 'A_VENIR' || match.statut === 'EN_RETARD',
      onClick: onReporter,
    },
    {
      libelle: 'Reprogrammer',
      description:
        match.statut === 'REPORTE'
          ? 'Fixe une nouvelle date et sort ce match du statut reporté.'
          : 'Disponible seulement pour un match reporté.',
      disponible: match.statut === 'REPORTE',
      onClick: onReprogrammer,
    },
    {
      libelle: 'Annuler',
      description:
        match.statut !== 'ANNULE' && match.statut !== 'TERMINE'
          ? 'Le match passe en annulé ; réactivable ensuite.'
          : 'Indisponible pour un match déjà annulé ou terminé.',
      disponible: match.statut !== 'ANNULE' && match.statut !== 'TERMINE',
      dangereux: true,
      onClick: onAnnuler,
    },
    {
      libelle: 'Réactiver',
      description: match.statut === 'ANNULE' ? 'Repasse le match à venir.' : 'Disponible seulement pour un match annulé.',
      disponible: match.statut === 'ANNULE',
      onClick: onReactiver,
    },
  ]

  return (
    <Dialogue ouvert={match !== null} onFermer={onFermer} titre="Gérer ce match">
      <div className="flex flex-col gap-2.5">
        {actions.map((action) => (
          <LigneAction key={action.libelle} {...action} />
        ))}
      </div>
    </Dialogue>
  )
}
