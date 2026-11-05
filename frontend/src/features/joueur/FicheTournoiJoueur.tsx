import { useState } from 'react'
import { useParams } from 'react-router'
import { CartePage } from '../../components/CartePage'
import { EnTetePage } from '../../components/EnTetePage'
import { Ballon } from '../../components/ui/Ballon'
import { BadgeStatutTournoi } from '../../components/ui/Badge'
import { Bouton } from '../../components/ui/Bouton'
import { EtatVide } from '../../components/ui/EtatVide'
import { LienRetour } from '../../components/ui/LienRetour'
import { Onglets, PanneauOnglet } from '../../components/ui/Onglets'
import { SqueletteLignes } from '../../components/ui/Squelette'
import { formaterJour } from '../../lib/format'
import { useMesTournoisJoueur, useMonProfil } from './api'
import { OngletCalendrierJoueur } from './OngletCalendrierJoueur'
import { OngletClassementJoueur } from './OngletClassementJoueur'

type IdOnglet = 'calendrier' | 'classement'

const ONGLETS = [
  { id: 'calendrier', libelle: 'Calendrier' },
  { id: 'classement', libelle: 'Classement' },
] as const

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
        <EnTetePage
          titre={tournoi.nom}
          description={`${tournoi.lieu} · ${formaterJour(tournoi.dateDebut)} – ${formaterJour(tournoi.dateFin)}`}
          icone={<Ballon mode="arret" className="size-6" />}
          actions={<BadgeStatutTournoi statut={tournoi.statut} />}
        />

        {equipe && (
          <p className="mb-6 text-sm text-text-mute">
            Ton équipe :{' '}
            <span className="inline-flex items-center gap-2 font-medium text-text">
              <span
                aria-hidden="true"
                className="size-3 shrink-0 rounded-full border border-border"
                style={{ backgroundColor: equipe.couleur }}
              />
              {equipe.nom}
            </span>{' '}
            · maillot n°{equipe.numeroDeMaillot}
          </p>
        )}

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
      </CartePage>
    </section>
  )
}
