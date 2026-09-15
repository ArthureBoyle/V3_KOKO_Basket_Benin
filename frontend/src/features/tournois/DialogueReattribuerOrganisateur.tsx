import { useMemo, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { useNotifier } from '../../components/notifications/contexte'
import { Bouton } from '../../components/ui/Bouton'
import { Champ, ChampSelect } from '../../components/ui/Champ'
import { Dialogue } from '../../components/ui/Dialogue'
import { useComptes } from '../comptes/api'
import { messageErreurApi } from '../../lib/erreurs'
import { comparerTexte } from '../../lib/tri'
import { useReattribuerOrganisateur } from './api'

function messageErreurCode(erreur: unknown): string {
  if (erreur instanceof ApiError) {
    if (erreur.status === 429) return 'Trop de codes refusés : réessaie dans 15 minutes.'
    if (erreur.status === 403 && erreur.message === 'Code admin invalide') return 'Code secret incorrect.'
  }
  return messageErreurApi(erreur)
}

interface Props {
  tournoiId: number
  organisateurActuelId: number
  ouvert: boolean
  onFermer: () => void
}

// Reassigner un tournoi a un autre organisateur : action protegee (code
// secret admin), meme modele que DialogueModifierIdentite pour l'email
// reel — un champ metier + un champ code dans le meme formulaire.
export function DialogueReattribuerOrganisateur({ tournoiId, organisateurActuelId, ouvert, onFermer }: Props) {
  const [organisateurId, setOrganisateurId] = useState('')
  const [codeAdmin, setCodeAdmin] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const reattribuer = useReattribuerOrganisateur(tournoiId)
  const notifier = useNotifier()
  const { data: comptes } = useComptes()

  const organisateurs = useMemo(
    () =>
      (comptes ?? [])
        .filter((compte) => compte.role === 'ORGANISATEUR' && compte.actif && compte.id !== organisateurActuelId)
        .sort((a, b) => comparerTexte(a.nom, b.nom)),
    [comptes, organisateurActuelId],
  )

  const fermer = () => {
    setOrganisateurId('')
    setCodeAdmin('')
    setErreur(null)
    onFermer()
  }

  const soumettre = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    setErreur(null)
    try {
      await reattribuer.mutateAsync({ organisateurId: Number(organisateurId), codeAdmin })
      notifier('Tournoi réassigné', 'succes')
      fermer()
    } catch (refus) {
      setErreur(messageErreurCode(refus))
      setCodeAdmin('')
    }
  }

  return (
    <Dialogue
      ouvert={ouvert}
      onFermer={fermer}
      titre="Réassigner l'organisateur"
      description="Le tournoi bascule intégralement vers le nouvel organisateur. Action protégée par le code secret admin."
      fermetureBloquee={reattribuer.isPending}
    >
      <form onSubmit={soumettre} className="flex flex-col gap-5">
        <ChampSelect
          libelle="Nouvel organisateur"
          required
          value={organisateurId}
          onChange={(e) => setOrganisateurId(e.target.value)}
          options={[
            { valeur: '', libelle: 'Sélectionner…' },
            ...organisateurs.map((o) => ({ valeur: String(o.id), libelle: `${o.prenom} ${o.nom}` })),
          ]}
        />
        <Champ
          libelle="Code secret admin"
          type="password"
          autoComplete="off"
          required
          value={codeAdmin}
          onChange={(e) => setCodeAdmin(e.target.value)}
          erreur={erreur ?? undefined}
        />
        <div className="flex justify-end gap-3">
          <Bouton variante="secondaire" onClick={fermer} disabled={reattribuer.isPending}>
            Annuler
          </Bouton>
          <Bouton type="submit" disabled={reattribuer.isPending || organisateurId === '' || codeAdmin.length === 0}>
            {reattribuer.isPending ? 'Vérification…' : 'Réassigner'}
          </Bouton>
        </div>
      </form>
    </Dialogue>
  )
}
