import { Eye } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router'
import { ApiError } from '../../api/client'
import { CartePage } from '../../components/CartePage'
import { Ballon } from '../../components/ui/Ballon'
import { BlocInfo } from '../../components/ui/BlocInfo'
import { BadgeStatutTournoi } from '../../components/ui/Badge'
import { Bouton } from '../../components/ui/Bouton'
import { Carreau } from '../../components/ui/Carreau'
import { EtatVide } from '../../components/ui/EtatVide'
import { LienRetour } from '../../components/ui/LienRetour'
import { Onglets, PanneauOnglet } from '../../components/ui/Onglets'
import { SqueletteLignes } from '../../components/ui/Squelette'
import { useSession } from '../auth/session'
import { messageErreurApi } from '../../lib/erreurs'
import { formaterPeriode } from '../../lib/format'
import { useTournoi } from './api'
import { LIBELLES_ALGORITHME } from './constantes'
import { DialogueCriteresAlgorithme } from './DialogueCriteresAlgorithme'
import { DialogueModifierTournoi } from './DialogueModifierTournoi'
import { DialogueReattribuerOrganisateur } from './DialogueReattribuerOrganisateur'
import { OngletClassement } from './OngletClassement'
import { OngletEquipes } from './OngletEquipes'
import { OngletLicences } from './OngletLicences'
import { OngletMatchs } from './OngletMatchs'
import { OngletStatistiques } from './OngletStatistiques'
import { CHEMIN_ADMIN } from '../../config/cheminAdmin'

type IdOnglet = 'infos' | 'licences' | 'equipes' | 'matchs' | 'classement' | 'statistiques'

const ONGLETS = [
  { id: 'infos', libelle: 'Infos' },
  { id: 'licences', libelle: 'Licences' },
  { id: 'equipes', libelle: 'Équipes' },
  { id: 'matchs', libelle: 'Matchs' },
  { id: 'classement', libelle: 'Classement' },
  { id: 'statistiques', libelle: 'Statistiques' },
] as const


export function FicheTournoi() {
  const { id } = useParams()
  const tournoiId = Number(id)
  const { data: tournoi, isLoading, isError, error } = useTournoi(tournoiId)
  const { data: session } = useSession()
  const estAdmin = session?.role === 'ADMIN'
  const [onglet, setOnglet] = useState<IdOnglet>('infos')
  const [reassignationOuverte, setReassignationOuverte] = useState(false)
  const [modificationOuverte, setModificationOuverte] = useState(false)
  const [criteresOuverts, setCriteresOuverts] = useState(false)

  if (isLoading) {
    return (
      <section>
        <SqueletteLignes lignes={6} />
      </section>
    )
  }

  if (isError || !tournoi) {
    const introuvable = error instanceof ApiError && error.status === 404
    return (
      <section>
        <EtatVide
          titre={introuvable ? 'Tournoi introuvable' : 'Erreur'}
          description={introuvable ? "Ce tournoi n'existe plus, ou a été supprimé." : messageErreurApi(error)}
          action={
            <Bouton variante="secondaire" onClick={() => history.back()}>
              Retour
            </Bouton>
          }
        />
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <LienRetour to={estAdmin ? `${CHEMIN_ADMIN}/tournois` : '/organisateur/tournois'}>Retour aux tournois</LienRetour>

      <CartePage>
        {/* Bloc d'identite : titre + statut, infos en petits blocs
            etiquetes, puis l'action — jamais une phrase collee. */}
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
          <BlocInfo libelle="Lieu">{tournoi.lieu}</BlocInfo>
          <BlocInfo libelle="Dates">{formaterPeriode(tournoi.dateDebut, tournoi.dateFin)}</BlocInfo>
        </div>

        <div className="mt-4 mb-8">
          <Bouton variante="secondaire" className="max-md:w-full" onClick={() => setModificationOuverte(true)}>
            Modifier les informations
          </Bouton>
        </div>

        {/* segmentee : ces 6 onglets SONT le contenu de la fiche (Infos,
            Licences, Equipes...), pas une navigation secondaire — de
            vraies pilules pleines, pas juste du texte souligne. */}
        <Onglets
          libelle="Section du tournoi"
          variante="segmentee"
          onglets={ONGLETS}
          actif={onglet}
          onChanger={(id) => setOnglet(id as IdOnglet)}
        />

        <PanneauOnglet id={onglet}>
          <div className="mt-6">
            {onglet === 'infos' && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <div className="col-span-2 md:col-span-1">
                  <Carreau libelle="Organisateur" centrer onClick={estAdmin ? () => setReassignationOuverte(true) : undefined}>
                    {tournoi.organisateur.prenom} {tournoi.organisateur.nom}
                  </Carreau>
                </div>
                <Carreau libelle="Licences max" centrer onClick={estAdmin ? () => setModificationOuverte(true) : undefined}>
                  <span className="tabular-nums">{tournoi.licencesMax}</span>
                </Carreau>
                <Carreau libelle="Équipes max" centrer onClick={estAdmin ? () => setModificationOuverte(true) : undefined}>
                  <span className="tabular-nums">{tournoi.equipesMax}</span>
                </Carreau>
                {tournoi.description && (
                  <div className="col-span-full">
                    <Carreau libelle="Description" centrer onClick={() => setModificationOuverte(true)}>
                      {tournoi.description}
                    </Carreau>
                  </div>
                )}
                <div className="relative">
                  <Carreau libelle="Algorithme de classement" onClick={estAdmin ? () => setModificationOuverte(true) : undefined}>
                    {LIBELLES_ALGORITHME[tournoi.algorithmeClassement] ?? tournoi.algorithmeClassement}
                  </Carreau>
                  {/* Mode vision : accessible aux DEUX roles (contrairement au
                      clic sur le carreau, reserve a l'ADMIN) — comprendre ce
                      qui compte ne devrait jamais dependre du droit d'edition. */}
                  <button
                    type="button"
                    onClick={() => setCriteresOuverts(true)}
                    aria-label="Voir les critères de cet algorithme"
                    title="Voir les critères de cet algorithme"
                    className="absolute top-2 right-2 rounded-full p-1 text-text-mute transition-colors duration-150 hover:bg-surface hover:text-text"
                  >
                    <Eye aria-hidden="true" className="size-4" />
                  </button>
                </div>
                <Carreau libelle="Lissage (k)" centrer onClick={estAdmin ? () => setModificationOuverte(true) : undefined}>
                  <span className="tabular-nums">{tournoi.coefficientLissage}</span>
                </Carreau>
                <Carreau libelle="Malus fautes (c)" centrer onClick={estAdmin ? () => setModificationOuverte(true) : undefined}>
                  <span className="tabular-nums">{tournoi.coefficientMalusFautes}</span>
                </Carreau>
                <Carreau libelle="Boost contres (b)" centrer onClick={estAdmin ? () => setModificationOuverte(true) : undefined}>
                  <span className="tabular-nums">{tournoi.coefficientBoostContres}</span>
                </Carreau>
              </div>
            )}
            {onglet === 'licences' && (
              <OngletLicences
                tournoiId={tournoiId}
                licencesMax={tournoi.licencesMax}
                equipes={tournoi.equipes}
                estAdmin={estAdmin}
              />
            )}
            {onglet === 'equipes' && <OngletEquipes tournoiId={tournoiId} equipesMax={tournoi.equipesMax} />}
            {onglet === 'matchs' && (
              <OngletMatchs tournoiId={tournoiId} equipes={tournoi.equipes} estAdmin={estAdmin} />
            )}
            {onglet === 'classement' && (
              <OngletClassement
                tournoiId={tournoiId}
                equipes={tournoi.equipes}
                algorithmeClassement={tournoi.algorithmeClassement}
              />
            )}
            {onglet === 'statistiques' && (
              <OngletStatistiques
                tournoiId={tournoiId}
                equipes={tournoi.equipes}
                algorithmeClassement={tournoi.algorithmeClassement}
                estAdmin={estAdmin}
              />
            )}
          </div>
        </PanneauOnglet>
      </CartePage>

      {/* Jamais monte pour un organisateur : useComptes() a l'interieur
          appelle GET /comptes, reserve ADMIN "sans exception" cote
          backend — un organisateur n'a de toute facon aucun moyen de
          l'ouvrir (voir le carreau Organisateur plus haut), autant ne
          jamais declencher cet appel voue a un 403. */}
      {estAdmin && (
        <DialogueReattribuerOrganisateur
          tournoiId={tournoiId}
          organisateurActuelId={tournoi.organisateurId}
          ouvert={reassignationOuverte}
          onFermer={() => setReassignationOuverte(false)}
        />
      )}
      <DialogueModifierTournoi
        tournoi={tournoi}
        ouvert={modificationOuverte}
        onFermer={() => setModificationOuverte(false)}
        estAdmin={estAdmin}
      />
      <DialogueCriteresAlgorithme
        ouvert={criteresOuverts}
        onFermer={() => setCriteresOuverts(false)}
        algorithme={tournoi.algorithmeClassement}
      />
    </section>
  )
}
