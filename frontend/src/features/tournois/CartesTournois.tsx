import { Link } from 'react-router'
import { Badge, BadgeStatutTournoi } from '../../components/ui/Badge'
import { BlocInfo } from '../../components/ui/BlocInfo'
import { CarteStatut } from '../../components/ui/CarteStatut'
import { formaterPeriode } from '../../lib/format'
import type { StatutTournoi, TournoiAdmin, TournoiOrganisateur } from '../../types/api'

const TONS_STATUT: Record<StatutTournoi, 'primaire' | 'succes' | 'neutre' | 'danger'> = {
  A_VENIR: 'primaire',
  ACTIF: 'succes',
  TERMINE: 'neutre',
  ANNULE: 'danger',
}

// Mobile : le grand rectangle est le lien vers le tournoi ; ses infos
// sont rangees en petits blocs etiquetes (meme principe que cote joueur).
// Partagees par l'organisateur et l'admin : lienBase = "/organisateur/tournois"
// ou "/admin/tournois". Cote admin, le nom de l'organisateur s'affiche.
export function CartesTournois({
  tournois,
  lienBase,
}: {
  tournois: (TournoiOrganisateur | TournoiAdmin)[]
  lienBase: string
}) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {tournois.map((t) => (
        <li key={t.id}>
          <Link to={`${lienBase}/${t.id}`} className="block">
            <CarteStatut ton={TONS_STATUT[t.statut]}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg leading-tight font-semibold break-words">{t.nom}</p>
                  <p className="mt-0.5 text-sm text-text-mute">{t.lieu}</p>
                </div>
                <BadgeStatutTournoi statut={t.statut} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {'organisateur' in t && (
                  <div className="col-span-2">
                    <BlocInfo libelle="Organisateur">
                      {t.organisateur.prenom} {t.organisateur.nom}
                    </BlocInfo>
                  </div>
                )}
                <div className="col-span-2">
                  <BlocInfo libelle="Dates">{formaterPeriode(t.dateDebut, t.dateFin)}</BlocInfo>
                </div>
                <BlocInfo libelle="Licences">
                  <span className="tabular-nums">
                    {t.compteurs.joueurs}/{t.licencesMax}
                  </span>
                </BlocInfo>
                <BlocInfo libelle="Équipes">
                  <span className="tabular-nums">
                    {t.compteurs.equipes}/{t.equipesMax}
                  </span>
                </BlocInfo>
              </div>
              {t.compteurs.scoresASaisir > 0 && (
                <p className="mt-3">
                  <Badge ton="alerte" pulse>
                    {t.compteurs.scoresASaisir} score{t.compteurs.scoresASaisir > 1 ? 's' : ''} à saisir
                  </Badge>
                </p>
              )}
            </CarteStatut>
          </Link>
        </li>
      ))}
    </ul>
  )
}
