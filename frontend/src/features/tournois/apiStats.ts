// ================================================
// STATS (par match) — appels API. Un hook par action, comme
// features/tournois/apiMatchs.ts.
// ================================================
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import type { SaisieStat, StatJoueurMatch } from '../../types/api'

export const cleStatsMatch = (matchId: number) => ['stats-match', matchId] as const

// matchId === null : dialogue ferme, aucune requete.
export function useStatsMatch(matchId: number | null) {
  return useQuery({
    queryKey: cleStatsMatch(matchId ?? -1),
    queryFn: () => api<StatJoueurMatch[]>(`/matchs/${matchId}/stats`),
    enabled: matchId !== null,
  })
}

// Saisie initiale ou correction (upsert cote backend, meme requete pour
// les deux) — plafonnee a 2 corrections pour l'organisateur, illimitee
// pour l'ADMIN, exactement comme le score du match.
export function useSaisirStat(matchId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ joueurId, donnees }: { joueurId: number; donnees: SaisieStat }) =>
      api<StatJoueurMatch>(`/matchs/${matchId}/stats/${joueurId}`, { methode: 'PUT', corps: donnees }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cleStatsMatch(matchId) })
      // Les totaux du classement joueurs dependent de ces stats.
      queryClient.invalidateQueries({ queryKey: ['classement-joueurs'] })
    },
  })
}

// ADMIN seulement (nettoyage d'une saisie erronee, voir supprimerStat
// cote backend) — ne consomme jamais le plafond de corrections.
export function useSupprimerStat(matchId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (joueurId: number) => api(`/matchs/${matchId}/stats/${joueurId}`, { methode: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cleStatsMatch(matchId) })
      queryClient.invalidateQueries({ queryKey: ['classement-joueurs'] })
    },
  })
}
