import { useState } from 'react'
import { useParams } from 'react-router'
import { CartePage } from '../../components/CartePage'
import { Ballon } from '../../components/ui/Ballon'
import { BadgeStatutTournoi } from '../../components/ui/Badge'
import { Bouton } from '../../components/ui/Bouton'
import { EtatVide } from '../../components/ui/EtatVide'
import { LienRetour } from '../../components/ui/LienRetour'
import { Onglets, PanneauOnglet } from '../../components/ui/Onglets'
import { SqueletteLignes } from '../../components/ui/Squelette'
import { formaterPeriode } from '../../lib/format'
import { useMesTournoisJoueur, useMonProfil } from './api'
import { OngletCalendrierJoueur } from './OngletCalendrierJoueur'
import { OngletClassementJoueur } from './OngletClassementJoueur'
import { LogoEquipe } from '../../components/ui/LogoEquipe'

type IdOnglet = 'calendrier' | 'classement'

const ONGLETS = [
  { id: 'calendrier', libelle: 'Calendrier' },
  { id: 'classement', libelle: 'Classement' },
] as const

function InfoTournoi({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-elevated px-4 py-3">
      <p className="text-2xs font-medium tracking-[0.08em] text-text-mute uppercase">{libelle}</p>
      <p className="mt-1 font-medium break-words">{valeur}</p>
    </div>
  )
}

// Lecture seule, jamais de GET /tournois/:id direct (ferme au role
// JOUEUR, voir accesTournoi.ts) : les infos du tournoi viennent de la
// meme liste que l'ecran "Mes tournois" (deja en cache TanStack Query,
// pas de requete en plus), retrouvee par id dans l'URL.
export function FicheTournoiJoueur() {
  const { id } = useParams()
  const tournoiId = Number(id)
  const [onglet, setOnglet] = useState<IdOnglet>('calendrier')

  const { data: inscriptions, isLoading } = useMesTournoisJoueur()
  const { data: profil } = useMonProfil()

  if (isLoading) {
    return (
      <section>
        <SqueletteLignes lignes={6} />
      </section>
    )
  }

  const inscription = inscriptions?.find((i) => i.tournoi.id === tournoiId)

  if (!inscription) {
    return (
      <section>
        <EtatVide
          titre="Tournoi introuvable"
          description="Ce tournoi n'existe plus, ou tu n'y es pas (ou plus) certifié."
          action={
            <Bouton variante="secondaire" onClick={() => history.back()}>
              Retour
            </Bouton>
          }
        />
      </section>
    )
  }

  const { tournoi, equipe } = inscription

  return (
    <section className="flex flex-col gap-4">
      <LienRetour to="/joueur/tournois">Retour aux tournois</LienRetour>

      <CartePage>
        {/* Bloc d'identite du tournoi : titre + statut, puis une grille
            d'infos etiquetees (une info = un petit bloc), jamais une
            phrase collee. */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-elevated">
              <Ballon mode="arret" className="size-6" />
            </span>
            <h1 className="min-w-0 text-2xl leading-tight font-semibold break-words">{tournoi.nom}</h1>
          </div>
          <BadgeStatutTournoi statut={tournoi.statut} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <InfoTournoi libelle="Lieu" valeur={tournoi.lieu} />
          <InfoTournoi libelle="Dates" valeur={formaterPeriode(tournoi.dateDebut, tournoi.dateFin)} />
          {equipe && (
            <div className="col-span-2 flex items-center gap-3 rounded-lg border border-border bg-elevated px-4 py-3">
              <LogoEquipe couleur={equipe.couleur} logo={equipe.logo} className="size-10" />
              <div className="min-w-0 flex-1">
                <p className="text-2xs font-medium tracking-[0.08em] text-text-mute uppercase">Ton équipe</p>
                <p className="truncate font-medium">{equipe.nom}</p>
              </div>
              <span className="shrink-0 rounded-md border border-border px-2.5 py-1 text-sm font-medium tabular-nums">
                n°{equipe.numeroDeMaillot}
              </span>
            </div>
          )}
        </div>

        <div className="mt-8">
        <Onglets
          libelle="Section du tournoi"
          variante="segmentee"
          onglets={ONGLETS}
          actif={onglet}
          onChanger={(id) => setOnglet(id as IdOnglet)}
        />

        <PanneauOnglet id={onglet}>
          <div className="mt-6">
            {onglet === 'calendrier' && (
              <OngletCalendrierJoueur tournoiId={tournoiId} monEquipeId={equipe?.id ?? null} />
            )}
            {onglet === 'classement' && (
              <OngletClassementJoueur tournoiId={tournoiId} monJoueurId={profil?.id ?? null} />
            )}
          </div>
        </PanneauOnglet>
        </div>
      </CartePage>
    </section>
  )
}
