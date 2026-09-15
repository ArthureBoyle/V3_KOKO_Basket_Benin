// ================================================
// MATCHS — appels API (ADMIN, dans le cadre d'un tournoi). Un hook par
// action, comme features/tournois/api.ts et apiEquipes.ts.
// ================================================
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import type { CreationMatch, MatchTournoi } from '../../types/api'
import { CLE_TOURNOIS } from './api'

export const cleMatchs = (tournoiId: number) => ['matchs', { tournoiId }] as const

export function useMatchs(tournoiId: number) {
  return useQuery({
    queryKey: cleMatchs(tournoiId),
    queryFn: () => api<MatchTournoi[]>(`/matchs?tournoiId=${tournoiId}`),
  })
}

// Invalide aussi CLE_TOURNOIS : le compteur "a saisir" de la liste des
// tournois (scoresASaisir) depend des matchs, jamais a jour sinon avant
// un rechargement complet.
function invalider(queryClient: ReturnType<typeof useQueryClient>, tournoiId: number) {
  queryClient.invalidateQueries({ queryKey: cleMatchs(tournoiId) })
  queryClient.invalidateQueries({ queryKey: CLE_TOURNOIS })
}

export function useCreerMatch(tournoiId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (donnees: CreationMatch) =>
      api<MatchTournoi>('/matchs', { methode: 'POST', corps: { ...donnees, tournoiId } }),
    onSuccess: () => invalider(queryClient, tournoiId),
  })
}

export function useSaisirScore(tournoiId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ matchId, score1, score2 }: { matchId: number; score1: number; score2: number }) =>
      api<MatchTournoi>(`/matchs/${matchId}/score`, { methode: 'PUT', corps: { score1, score2 } }),
    onSuccess: () => invalider(queryClient, tournoiId),
  })
}

export function useAnnulerMatch(tournoiId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (matchId: number) => api<MatchTournoi>(`/matchs/${matchId}/annuler`, { methode: 'PUT' }),
    onSuccess: () => invalider(queryClient, tournoiId),
  })
}

export function useReactiverMatch(tournoiId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (matchId: number) => api<MatchTournoi>(`/matchs/${matchId}/reactiver`, { methode: 'PUT' }),
    onSuccess: () => invalider(queryClient, tournoiId),
  })
}

// Passe en REPORTE sans nouvelle date (etat bloquant separe, voir
// useReprogrammerMatch) — le backend garde la date d'origine tout seul.
export function useReporterMatch(tournoiId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (matchId: number) => api<MatchTournoi>(`/matchs/${matchId}/reporter`, { methode: 'PUT' }),
    onSuccess: () => invalider(queryClient, tournoiId),
  })
}

export function useReprogrammerMatch(tournoiId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ matchId, nouvelleDate }: { matchId: number; nouvelleDate: string }) =>
      api<MatchTournoi>(`/matchs/${matchId}/reprogrammer`, { methode: 'PUT', corps: { nouvelleDate } }),
    onSuccess: () => invalider(queryClient, tournoiId),
  })
}
