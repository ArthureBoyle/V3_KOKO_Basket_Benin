import { useRef, useState, type FormEvent } from 'react'
import { useNotifier } from '../../components/notifications/contexte'
import { Bouton } from '../../components/ui/Bouton'
import { Champ, ChampSelect } from '../../components/ui/Champ'
import { Dialogue } from '../../components/ui/Dialogue'
import { EtatVide } from '../../components/ui/EtatVide'
import { SqueletteLignes } from '../../components/ui/Squelette'
import { messageErreurApi } from '../../lib/erreurs'
import { urlImage } from '../../lib/format'
import type { JoueurPoolTournoi } from '../../types/api'
import {
  useAjouterJoueurEquipe,
  useEquipe,
  useRetirerJoueurEquipe,
  useSupprimerEquipe,
  useUploaderLogoEquipe,
} from './apiEquipes'

interface Props {
  equipeId: number | null
  tournoiId: number
  pool: JoueurPoolTournoi[]
  onFermer: () => void
}

// Effectif d'une equipe : ajout UNIQUEMENT depuis le pool de licences deja
// certifie pour ce tournoi (jamais de recherche libre — voir
// ajouterJoueurSchema cote backend), filtre ici aux joueurs pas encore
// dans une equipe (equipeId === null dans le pool).
export function DialogueEffectifEquipe({ equipeId, tournoiId, pool, onFermer }: Props) {
  const ouvert = equipeId !== null
  const { data: equipe, isLoading, isError, error } = useEquipe(equipeId)
  const [joueurId, setJoueurId] = useState('')
  const [numero, setNumero] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const ajouter = useAjouterJoueurEquipe(equipeId ?? -1, tournoiId)
  const retirer = useRetirerJoueurEquipe(equipeId ?? -1, tournoiId)
  const supprimer = useSupprimerEquipe(tournoiId)
  const uploaderLogo = useUploaderLogoEquipe(equipeId ?? -1, tournoiId)
  const notifier = useNotifier()
  const entreeFichier = useRef<HTMLInputElement>(null)

  const choisirLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    setErreur(null)
    uploaderLogo.mutate(fichier, {
      onSuccess: () => notifier('Logo mis à jour', 'succes'),
      onError: (err) => setErreur(messageErreurApi(err)),
    })
  }

  const fermer = () => {
    setJoueurId('')
    setNumero('')
    setErreur(null)
    onFermer()
  }

  const libresDuPool = pool.filter((joueur) => joueur.equipeId === null)

  const soumettre = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    setErreur(null)
    try {
      await ajouter.mutateAsync({ joueurId: Number(joueurId), numeroDeMaillot: Number(numero) })
      setJoueurId('')
      setNumero('')
      notifier('Joueur ajouté à l’équipe', 'succes')
    } catch (refus) {
      setErreur(messageErreurApi(refus))
    }
  }

  const supprimerEquipe = async () => {
    if (equipeId === null) return
    try {
      await supprimer.mutateAsync(equipeId)
      notifier('Équipe supprimée', 'succes')
      fermer()
    } catch (refus) {
      setErreur(messageErreurApi(refus))
    }
  }

  return (
    <Dialogue
      ouvert={ouvert}
      onFermer={fermer}
      titre={equipe ? `Effectif — ${equipe.nom}` : 'Effectif'}
      fermetureBloquee={ajouter.isPending}
    >
      {isLoading || !equipe ? (
        <SqueletteLignes lignes={3} />
      ) : isError ? (
        <p role="alert" className="text-sm text-danger">
          {messageErreurApi(error)}
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4 border-b border-border pb-5">
            <div
              className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border"
              style={{ backgroundColor: equipe.logo ? undefined : equipe.couleur }}
            >
              {equipe.logo ? (
                <img src={urlImage(equipe.logo)} alt="" className="size-full object-cover" />
              ) : (
                <span aria-hidden="true" className="size-3 rounded-full bg-elevated" />
              )}
            </div>
            <div>
              <input
                ref={entreeFichier}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={choisirLogo}
              />
              <Bouton
                variante="secondaire"
                onClick={() => entreeFichier.current?.click()}
                disabled={uploaderLogo.isPending}
              >
                {uploaderLogo.isPending ? 'Envoi…' : equipe.logo ? 'Changer le logo' : 'Ajouter un logo'}
              </Bouton>
              <p className="mt-1.5 text-xs text-text-mute">JPEG, PNG ou WebP, 3 Mo maximum.</p>
            </div>
          </div>

          <form onSubmit={soumettre} className="flex items-end gap-3">
            <div className="min-w-0 flex-1">
              <ChampSelect
                libelle="Joueur du pool (sans équipe)"
                required
                value={joueurId}
                onChange={(e) => setJoueurId(e.target.value)}
                options={[
                  { valeur: '', libelle: 'Sélectionner…' },
                  ...libresDuPool.map((joueur) => ({
                    valeur: String(joueur.id),
                    libelle: `${joueur.prenom} ${joueur.nomLegal} (${joueur.idKoko})`,
                  })),
                ]}
              />
            </div>
            <div className="w-20">
              <Champ
                libelle="N°"
                type="number"
                min={0}
                max={99}
                required
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
              />
            </div>
            <Bouton type="submit" disabled={ajouter.isPending || joueurId === '' || numero === ''}>
              {ajouter.isPending ? 'Ajout…' : 'Ajouter'}
            </Bouton>
          </form>
          {libresDuPool.length === 0 && (
            <p className="text-xs text-text-mute">
              Aucun joueur libre : certifie-le d'abord dans l'onglet Licences.
            </p>
          )}
          {erreur && (
            <p role="alert" className="text-sm text-danger">
              {erreur}
            </p>
          )}

          {equipe.joueurs.length === 0 ? (
            <EtatVide titre="Effectif vide" description="Ajoute un joueur depuis le pool ci-dessus." />
          ) : (
            <div className="flex flex-col gap-2">
              {equipe.joueurs.map((membre) => (
                <div
                  key={membre.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-elevated px-3 py-2"
                >
                  <span>
                    <span className="mr-2 font-mono text-xs text-text-mute">#{membre.numeroDeMaillot}</span>
                    {membre.joueur.prenom} {membre.joueur.nomLegal}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      retirer.mutate(membre.joueur.id, {
                        onSuccess: () => notifier('Joueur retiré de l’équipe', 'succes'),
                      })
                    }
                    disabled={retirer.isPending}
                    className="effet-remplissage effet-remplissage-danger rounded-md border border-danger/30 bg-danger/12 px-2.5 py-1 text-xs font-medium text-danger transition-[border-color] duration-150 disabled:opacity-60"
                  >
                    <span className="contenu-remplissage">Retirer</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between border-t border-border pt-4">
            <button
              type="button"
              onClick={supprimerEquipe}
              disabled={supprimer.isPending}
              className="effet-remplissage effet-remplissage-danger rounded-md border border-danger/30 bg-danger/12 px-2.5 py-1 text-xs font-medium text-danger transition-[border-color] duration-150 disabled:opacity-60"
            >
              <span className="contenu-remplissage">
                {supprimer.isPending ? 'Suppression…' : "Supprimer l'équipe"}
              </span>
            </button>
            <Bouton variante="secondaire" onClick={fermer}>
              Fermer
            </Bouton>
          </div>
        </div>
      )}
    </Dialogue>
  )
}
