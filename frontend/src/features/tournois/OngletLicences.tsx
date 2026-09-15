import { useMemo, useState, type FormEvent } from 'react'
import { useNotifier } from '../../components/notifications/contexte'
import { Bouton } from '../../components/ui/Bouton'
import { CarteStatut } from '../../components/ui/CarteStatut'
import { EtatVide } from '../../components/ui/EtatVide'
import { SqueletteLignes } from '../../components/ui/Squelette'
import { useComptes } from '../comptes/api'
import { messageErreurApi } from '../../lib/erreurs'
import { formaterNomJoueur } from '../../lib/format'
import type { EquipeResumeTournoi } from '../../types/api'
import { useAssignerJoueur, useDesassignerJoueur, useJoueursPool } from './api'
import { RechercheJoueur, type JoueurRecherchable } from './RechercheJoueur'

interface Props {
  tournoiId: number
  licencesMax: number
  equipes: EquipeResumeTournoi[]
  // ORGANISATEUR : lecture seule (assignerJoueur/desassignerJoueur sont
  // ADMIN seulement cote backend — GET /tournois/:id/joueurs reste
  // autorise, voir getJoueursDisponibles). Par defaut true : l'appel
  // existant depuis la fiche admin ne change pas.
  estAdmin?: boolean
}

// Pool de licences (TournoiJoueur) : les joueurs certifies pour CE
// tournoi. On y ajoute par ID KOKO (jamais de recherche libre — c'est
// l'identifiant que l'admin manipule humainement, voir assignerJoueurSchema),
// jamais autre chose : cette liste EST le choix dans lequel l'organisateur
// pioche ensuite pour former ses equipes (onglet Equipes, a venir).
export function OngletLicences({ tournoiId, licencesMax, equipes, estAdmin = true }: Props) {
  const { data: pool, isLoading, isError, error } = useJoueursPool(tournoiId)
  const { data: comptes } = useComptes(estAdmin)
  const [texteRecherche, setTexteRecherche] = useState('')
  const [joueurChoisi, setJoueurChoisi] = useState<JoueurRecherchable | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const assigner = useAssignerJoueur(tournoiId)
  const desassigner = useDesassignerJoueur(tournoiId)
  const notifier = useNotifier()

  // Deja certifies pour CE tournoi : inutiles a proposer de nouveau (le
  // backend les refuserait avec "deja assigne a ce tournoi" de toute facon).
  const idKokoDejaDansLePool = useMemo(() => new Set((pool ?? []).map((j) => j.idKoko)), [pool])
  const joueursProposables = useMemo(
    () =>
      (comptes ?? [])
        .filter(
          (compte): compte is typeof compte & { joueur: NonNullable<typeof compte.joueur> } =>
            compte.role === 'JOUEUR' && compte.joueur !== null && !idKokoDejaDansLePool.has(compte.joueur.idKoko),
        )
        .map((compte) => ({
          idKoko: compte.joueur.idKoko,
          nom: compte.nom,
          prenom: compte.prenom,
          surnom: compte.joueur.surnom,
        })),
    [comptes, idKokoDejaDansLePool],
  )

  if (isLoading) return <SqueletteLignes lignes={4} />
  if (isError) {
    return (
      <p role="alert" className="text-sm text-danger">
        {messageErreurApi(error)}
      </p>
    )
  }

  const nombre = pool?.length ?? 0
  const plein = nombre >= licencesMax
  const nomEquipe = (equipeId: number) => equipes.find((e) => e.id === equipeId)?.nom ?? '—'

  const soumettre = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    if (!joueurChoisi) return
    setErreur(null)
    try {
      await assigner.mutateAsync(joueurChoisi.idKoko)
      setTexteRecherche('')
      setJoueurChoisi(null)
      notifier('Joueur ajouté au pool', 'succes')
    } catch (refus) {
      setErreur(messageErreurApi(refus))
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-text-mute">
        <span className="font-medium text-text tabular-nums">{nombre}</span> / {licencesMax} licences utilisées
      </p>

      {estAdmin && (
        <form onSubmit={soumettre} className="flex items-end gap-3">
          <div className="max-w-xs flex-1">
            <RechercheJoueur
              valeur={texteRecherche}
              onChangerValeur={(texte) => {
                setTexteRecherche(texte)
                setJoueurChoisi(null)
              }}
              onSelectionner={(joueur) => {
                setJoueurChoisi(joueur)
                setTexteRecherche(formaterNomJoueur(joueur))
              }}
              joueurs={joueursProposables}
              erreur={erreur ?? undefined}
              disabled={plein}
            />
            {plein && <p className="mt-1 text-xs text-warning">Limite de licences atteinte pour ce tournoi.</p>}
          </div>
          <Bouton type="submit" disabled={assigner.isPending || !joueurChoisi || plein}>
            {assigner.isPending ? 'Ajout…' : 'Ajouter au pool'}
          </Bouton>
        </form>
      )}

      {nombre === 0 ? (
        <EtatVide
          titre="Aucun joueur certifié"
          description={estAdmin ? 'Cherche un joueur par nom pour commencer.' : "L'administration n'a pas encore certifié de joueur."}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {pool!.map((joueur) => (
            <CarteStatut key={joueur.id} ton="primaire">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {joueur.prenom} {joueur.nomLegal}
                  </p>
                  <p className="font-mono text-xs text-text-mute">{joueur.idKoko}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-text-mute">
                    {joueur.equipeId ? nomEquipe(joueur.equipeId) : "Pas encore d'équipe"}
                  </span>
                  {estAdmin && (
                    <button
                      type="button"
                      onClick={() =>
                        desassigner.mutate(joueur.id, {
                          onSuccess: () => notifier('Joueur retiré du pool', 'succes'),
                        })
                      }
                      disabled={desassigner.isPending}
                      className="effet-remplissage effet-remplissage-danger rounded-md border border-danger/30 bg-danger/12 px-2.5 py-1 text-xs font-medium text-danger transition-[border-color] duration-150 disabled:opacity-60"
                    >
                      <span className="contenu-remplissage">Retirer</span>
                    </button>
                  )}
                </div>
              </div>
            </CarteStatut>
          ))}
        </div>
      )}
    </div>
  )
}
