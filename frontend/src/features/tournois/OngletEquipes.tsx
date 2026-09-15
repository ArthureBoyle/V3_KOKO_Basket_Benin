import { useState } from 'react'
import { Bouton } from '../../components/ui/Bouton'
import { EtatVide } from '../../components/ui/EtatVide'
import { SqueletteLignes } from '../../components/ui/Squelette'
import { messageErreurApi } from '../../lib/erreurs'
import { useJoueursPool } from './api'
import { useEquipes } from './apiEquipes'
import { DialogueCreerEquipe } from './DialogueCreerEquipe'
import { DialogueEffectifEquipe } from './DialogueEffectifEquipe'

export function OngletEquipes({ tournoiId, equipesMax }: { tournoiId: number; equipesMax: number }) {
  const { data: equipes, isLoading, isError, error } = useEquipes(tournoiId)
  // Le compte de joueurs par equipe vient du pool DEJA charge (chaque
  // entree y porte son equipeId) : pas de requete GET /equipes/:id en
  // plus pour chacune, juste pour afficher un effectif.
  const { data: pool } = useJoueursPool(tournoiId)
  const [creationOuverte, setCreationOuverte] = useState(false)
  const [equipeSelectionneeId, setEquipeSelectionneeId] = useState<number | null>(null)

  if (isLoading) return <SqueletteLignes lignes={4} />
  if (isError) {
    return (
      <p role="alert" className="text-sm text-danger">
        {messageErreurApi(error)}
      </p>
    )
  }

  const effectifParEquipe = new Map<number, number>()
  for (const joueur of pool ?? []) {
    if (joueur.equipeId !== null) {
      effectifParEquipe.set(joueur.equipeId, (effectifParEquipe.get(joueur.equipeId) ?? 0) + 1)
    }
  }

  const nombre = equipes?.length ?? 0
  const plein = nombre >= equipesMax

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-text-mute">
          <span className="font-medium text-text tabular-nums">{nombre}</span> / {equipesMax} équipes
        </p>
        <Bouton magnetique onClick={() => setCreationOuverte(true)} disabled={plein}>
          Créer une équipe
        </Bouton>
      </div>
      {plein && <p className="text-xs text-warning">Limite d'équipes atteinte pour ce tournoi.</p>}

      {nombre === 0 ? (
        <EtatVide titre="Aucune équipe" description="Crée la première équipe de ce tournoi." />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {equipes!.map((equipe) => {
            const effectif = effectifParEquipe.get(equipe.id) ?? 0
            return (
              <button
                key={equipe.id}
                type="button"
                onClick={() => setEquipeSelectionneeId(equipe.id)}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 text-left transition-colors duration-150 hover:border-primary hover:bg-elevated"
              >
                {/* Couleur choisie par l'organisateur pour CETTE equipe
                    (maillot reel) : une donnee, pas un token de theme —
                    rien a voir avec la regle "jamais de couleur en dur"
                    qui ne couvre que le chrome de l'interface. */}
                <span
                  aria-hidden="true"
                  className="size-4 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: equipe.couleur }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{equipe.nom}</p>
                  <p className="text-xs text-text-mute">
                    {effectif} joueur{effectif > 1 ? 's' : ''}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <DialogueCreerEquipe tournoiId={tournoiId} ouvert={creationOuverte} onFermer={() => setCreationOuverte(false)} />
      <DialogueEffectifEquipe
        equipeId={equipeSelectionneeId}
        tournoiId={tournoiId}
        pool={pool ?? []}
        onFermer={() => setEquipeSelectionneeId(null)}
      />
    </div>
  )
}
