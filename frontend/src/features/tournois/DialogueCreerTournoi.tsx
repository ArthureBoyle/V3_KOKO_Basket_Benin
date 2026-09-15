import { useMemo, useState, type FormEvent } from 'react'
import { Bouton } from '../../components/ui/Bouton'
import { Champ, ChampJour, ChampSelect, ChampZoneTexte } from '../../components/ui/Champ'
import { Dialogue } from '../../components/ui/Dialogue'
import { useComptes } from '../comptes/api'
import { messageErreurApi } from '../../lib/erreurs'
import { comparerTexte } from '../../lib/tri'
import { useCreerTournoi } from './api'

const VIDE = {
  nom: '',
  lieu: '',
  description: '',
  dateDebut: '',
  dateFin: '',
  organisateurId: '',
  licencesMax: '',
  equipesMax: '',
}

// L'ADMIN choisit l'organisateur parmi les comptes DEJA crees (jamais de
// saisie libre) : un tournoi suit toujours la verification de paiement
// faite hors app, l'organisateur existe forcement avant.
export function DialogueCreerTournoi({ ouvert, onFermer }: { ouvert: boolean; onFermer: () => void }) {
  const [champs, setChamps] = useState(VIDE)
  const [erreur, setErreur] = useState<string | null>(null)
  const creer = useCreerTournoi()
  const { data: comptes } = useComptes()

  const organisateurs = useMemo(
    () =>
      (comptes ?? [])
        .filter((compte) => compte.role === 'ORGANISATEUR' && compte.actif)
        .sort((a, b) => comparerTexte(a.nom, b.nom)),
    [comptes],
  )

  const fermer = () => {
    setChamps(VIDE)
    setErreur(null)
    onFermer()
  }

  const soumettre = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    setErreur(null)
    try {
      await creer.mutateAsync({
        nom: champs.nom,
        lieu: champs.lieu,
        ...(champs.description.trim() !== '' ? { description: champs.description } : {}),
        dateDebut: champs.dateDebut,
        dateFin: champs.dateFin,
        organisateurId: Number(champs.organisateurId),
        licencesMax: Number(champs.licencesMax),
        equipesMax: Number(champs.equipesMax),
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
      titre="Créer un tournoi"
      description="Licences et équipes correspondent à ce qui a été payé hors application."
      fermetureBloquee={creer.isPending}
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
        <ChampSelect
          libelle="Organisateur"
          required
          value={champs.organisateurId}
          onChange={(e) => setChamps({ ...champs, organisateurId: e.target.value })}
          options={[
            { valeur: '', libelle: 'Sélectionner…' },
            ...organisateurs.map((o) => ({ valeur: String(o.id), libelle: `${o.prenom} ${o.nom}` })),
          ]}
        />
        <div className="grid grid-cols-2 gap-4">
          <Champ
            libelle="Licences max"
            type="number"
            min={1}
            required
            aide="Joueurs payés pour ce tournoi"
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
        {erreur && (
          <p role="alert" className="text-sm text-danger">
            {erreur}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Bouton variante="secondaire" onClick={fermer} disabled={creer.isPending}>
            Annuler
          </Bouton>
          <Bouton type="submit" disabled={creer.isPending}>
            {creer.isPending ? 'Création…' : 'Créer'}
          </Bouton>
        </div>
      </form>
    </Dialogue>
  )
}
