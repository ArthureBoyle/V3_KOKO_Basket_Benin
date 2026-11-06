import { LogoEquipe } from '../../components/ui/LogoEquipe'

export interface InfoEquipe {
  nom: string
  couleur: string
  logo: string | null
}

// Une equipe par ligne (logo, nom sur 2 lignes max, score a droite) : brique
// commune des cartes de match (onglets Matchs et Statistiques).
export function LigneEquipe({ info, score }: { info: InfoEquipe; score: number | null }) {
  return (
    <p className="flex items-center gap-3">
      <LogoEquipe couleur={info.couleur} logo={info.logo} className="size-6" />
      <span title={info.nom} className="line-clamp-2 min-w-0 flex-1 font-medium break-words">
        {info.nom}
      </span>
      {score !== null && <span className="shrink-0 font-semibold tabular-nums">{score}</span>}
    </p>
  )
}
