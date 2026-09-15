import { useState, type FormEvent } from 'react'
import { Bouton } from '../../components/ui/Bouton'
import { Champ, ChampJour, ChampSelect, ChampZoneTexte } from '../../components/ui/Champ'
import { Dialogue } from '../../components/ui/Dialogue'
import { messageErreurApi } from '../../lib/erreurs'
import { isoVersJour } from '../../lib/format'
import type { TournoiDetail } from '../../types/api'
import { useModifierTournoi } from './api'
import { OPTIONS_ALGORITHME } from './constantes'

interface Props {
  tournoi: TournoiDetail
  ouvert: boolean
  onFermer: () => void
  // ORGANISATEUR : nom/lieu/description seulement (modifierTournoi cote
  // backend refuse les autres champs pour lui — "champsReservesAdmin").
  // Par defaut true : les appels existants (fiche admin) ne changent pas.
  estAdmin?: boolean
}

function champsDepuis(tournoi: TournoiDetail) {
  return {
    nom: tournoi.nom,
    lieu: tournoi.lieu,
    description: tournoi.description ?? '',
    dateDebut: isoVersJour(tournoi.dateDebut),
    dateFin: isoVersJour(tournoi.dateFin),
    licencesMax: String(tournoi.licencesMax),
    equipesMax: String(tournoi.equipesMax),
    algorithmeClassement: tournoi.algorithmeClassement,
    coefficientLissage: String(tournoi.coefficientLissage),
    coefficientMalusFautes: String(tournoi.coefficientMalusFautes),
    coefficientBoostContres: String(tournoi.coefficientBoostContres),
  }
}

// Tout ce qui est fixe a la creation reste corrigeable ensuite : les
// besoins du client changent, une erreur de saisie arrive — l'ADMIN doit
// pouvoir ajuster ces champs depuis l'appli, jamais en touchant la base
// directement. Seule la reassignation d'organisateur reste a part (code
// secret, formulaire dedie — voir DialogueReattribuerOrganisateur).
export function DialogueModifierTournoi({ tournoi, ouvert, onFermer, estAdmin = true }: Props) {
  const [champs, setChamps] = useState(champsDepuis(tournoi))
  const [erreur, setErreur] = useState<string | null>(null)
  const modifier = useModifierTournoi(tournoi.id)

  const fermer = () => {
    setChamps(champsDepuis(tournoi))
    setErreur(null)
    onFermer()
  }

  const soumettre = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    setErreur(null)
    try {
      await modifier.mutateAsync({
        nom: champs.nom,
        lieu: champs.lieu,
        description: champs.description,
        ...(estAdmin
          ? {
              dateDebut: champs.dateDebut,
              dateFin: champs.dateFin,
              licencesMax: Number(champs.licencesMax),
              equipesMax: Number(champs.equipesMax),
              algorithmeClassement: champs.algorithmeClassement,
              coefficientLissage: Number(champs.coefficientLissage),
              coefficientMalusFautes: Number(champs.coefficientMalusFautes),
              coefficientBoostContres: Number(champs.coefficientBoostContres),
            }
          : {}),
      })
      fermer()
    } catch (refus) {
      setErreur(messageErreurApi(refus))
    }
  }

  return (
    <Dialogue
      ouvert={ouvert}
      onFermer={fermer}
      titre="Modifier les informations"
      description={
        estAdmin
          ? "Sans code secret : ces champs ne sont pas jugés sensibles, contrairement à la réassignation d'organisateur."
          : 'Les dates, licences, équipes et réglages de classement restent gérés par l’administration.'
      }
      fermetureBloquee={modifier.isPending}
    >
      <form onSubmit={soumettre} className="flex flex-col gap-5">
        <Champ
          libelle="Nom du tournoi"
          required
          value={champs.nom}
          onChange={(e) => setChamps({ ...champs, nom: e.target.value })}
        />
        <Champ
          libelle="Lieu"
          required
          value={champs.lieu}
          onChange={(e) => setChamps({ ...champs, lieu: e.target.value })}
        />
        <ChampZoneTexte
          libelle="Description"
          aide="Facultatif"
          value={champs.description}
          onChange={(e) => setChamps({ ...champs, description: e.target.value })}
        />
        {estAdmin && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <ChampJour
                libelle="Date de début"
                required
                value={champs.dateDebut}
                onChange={(e) => setChamps({ ...champs, dateDebut: e.target.value })}
              />
              <ChampJour
                libelle="Date de fin"
                required
                min={champs.dateDebut || undefined}
                value={champs.dateFin}
                onChange={(e) => setChamps({ ...champs, dateFin: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Champ
                libelle="Licences max"
                type="number"
                min={1}
                required
                value={champs.licencesMax}
                onChange={(e) => setChamps({ ...champs, licencesMax: e.target.value })}
              />
              <Champ
                libelle="Équipes max"
                type="number"
                min={1}
                required
                value={champs.equipesMax}
                onChange={(e) => setChamps({ ...champs, equipesMax: e.target.value })}
              />
            </div>
            <ChampSelect
              libelle="Algorithme de classement"
              required
              value={champs.algorithmeClassement}
              onChange={(e) =>
                setChamps({ ...champs, algorithmeClassement: e.target.value as typeof champs.algorithmeClassement })
              }
              options={OPTIONS_ALGORITHME}
            />
            <div className="grid grid-cols-3 gap-4">
              <Champ
                libelle="Lissage (k)"
                type="number"
                min={1}
                required
                value={champs.coefficientLissage}
                onChange={(e) => setChamps({ ...champs, coefficientLissage: e.target.value })}
              />
              <Champ
                libelle="Malus fautes (c)"
                type="number"
                min={0}
                step={0.1}
                required
                value={champs.coefficientMalusFautes}
                onChange={(e) => setChamps({ ...champs, coefficientMalusFautes: e.target.value })}
              />
              <Champ
                libelle="Boost contres (b)"
                type="number"
                min={0}
                step={0.1}
                required
                value={champs.coefficientBoostContres}
                onChange={(e) => setChamps({ ...champs, coefficientBoostContres: e.target.value })}
              />
            </div>
          </>
        )}
        {erreur && (
          <p role="alert" className="text-sm text-danger">
            {erreur}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Bouton variante="secondaire" onClick={fermer} disabled={modifier.isPending}>
            Annuler
          </Bouton>
          <Bouton type="submit" disabled={modifier.isPending}>
            {modifier.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Bouton>
        </div>
      </form>
    </Dialogue>
  )
}
