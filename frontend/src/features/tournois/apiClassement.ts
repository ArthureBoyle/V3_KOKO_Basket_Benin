// ================================================
// CLASSEMENT — lecture seule, recalculee a la volee par le backend a
// chaque appel (jamais stockee, jamais modifiable depuis ces hooks).
// ================================================
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import type { EquipeClassee, JoueurClasse } from '../../types/api'

export function useClassementJoueurs(tournoiId: number, matchsJoues: number | null) {
  return useQuery({
    queryKey: ['classement-joueurs', tournoiId, matchsJoues],
    queryFn: () =>
      api<JoueurClasse[]>(
        `/tournois/${tournoiId}/classement${matchsJoues !== null ? `?matchsJoues=${matchsJoues}` : ''}`,
      ),
  })
}

export function useClassementEquipes(tournoiId: number) {
  return useQuery({
    queryKey: ['classement-equipes', tournoiId],
    queryFn: () => api<EquipeClassee[]>(`/tournois/${tournoiId}/classement-equipes`),
  })
}
