import { Link } from 'react-router'
import { BadgeStatutTournoi } from '../../components/ui/Badge'
import { BlocInfo } from '../../components/ui/BlocInfo'
import { CarteStatut } from '../../components/ui/CarteStatut'
import { formaterPeriode } from '../../lib/format'
import type { InscriptionJoueur, StatutTournoi } from '../../types/api'
import { LogoEquipe } from '../../components/ui/LogoEquipe'

const TONS_STATUT: Record<StatutTournoi, 'primaire' | 'succes' | 'neutre' | 'danger'> = {
  A_VENIR: 'primaire',
  ACTIF: 'succes',
  TERMINE: 'neutre',
  ANNULE: 'danger',
}

// Mobile : le grand rectangle est le bouton (lien vers la fiche), ses
// infos sont rangees en petits blocs etiquetes — pas une pile de lignes.
export function CartesTournoisJoueur({ lignes }: { lignes: InscriptionJoueur[] }) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {lignes.map((l) => (
        <li key={l.tournoi.id}>
          <Link to={`/joueur/tournois/${l.tournoi.id}`} className="block">
            <CarteStatut ton={TONS_STATUT[l.tournoi.statut]}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg leading-tight font-semibold break-words">{l.tournoi.nom}</p>
                  <p className="mt-0.5 text-sm text-text-mute">{l.tournoi.lieu}</p>
                </div>
                <BadgeStatutTournoi statut={l.tournoi.statut} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <BlocInfo libelle="Équipe">
                  {l.equipe ? (
                    <span className="flex items-center gap-2">
                      <LogoEquipe couleur={l.equipe.couleur} logo={l.equipe.logo} className="size-5" />
                      <span className="min-w-0 truncate">{l.equipe.nom}</span>
                    </span>
                  ) : (
                    <span className="text-text-mute">Pas encore assignée</span>
                  )}
                </BlocInfo>
                <BlocInfo libelle="Dates">{formaterPeriode(l.tournoi.dateDebut, l.tournoi.dateFin)}</BlocInfo>
              </div>
            </CarteStatut>
          </Link>
        </li>
      ))}
    </ul>
  )
}
