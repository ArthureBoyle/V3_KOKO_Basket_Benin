// ================================================
// TOURNOIS — appels API (ADMIN). Un hook par action, comme features/comptes.
// ================================================
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import type {
  CreationTournoi,
  JoueurPoolTournoi,
  ModificationTournoi,
  TournoiAdmin,
  TournoiDetail,
  TournoiOrganisateur,
} from '../../types/api'

export const CLE_TOURNOIS = ['tournois'] as const
export const CLE_MES_TOURNOIS = ['tournois', 'mes-tournois'] as const
export const cleTournoi = (id: number) => ['tournois', id] as const
export const clePoolTournoi = (id: number) => ['tournois', id, 'joueurs'] as const

export function useTournois() {
  return useQuery({
    queryKey: CLE_TOURNOIS,
    queryFn: () => api<TournoiAdmin[]>('/tournois'),
  })
}

// ORGANISATEUR seulement — scope automatique sur ses propres tournois
// (voir GET /tournois/mes-tournois cote backend).
export function useMesTournois() {
  return useQuery({
    queryKey: CLE_MES_TOURNOIS,
    queryFn: () => api<TournoiOrganisateur[]>('/tournois/mes-tournois'),
  })
}

export function useTournoi(id: number) {
  return useQuery({
    queryKey: cleTournoi(id),
    queryFn: () => api<TournoiDetail>(`/tournois/${id}`),
  })
}

export function useCreerTournoi() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (donnees: CreationTournoi) =>
      api<TournoiAdmin>('/tournois', { methode: 'POST', corps: donnees }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLE_TOURNOIS }),
  })
}

// Pool de licences (TournoiJoueur) d'un tournoi — onglet Licences.
export function useJoueursPool(tournoiId: number) {
  return useQuery({
    queryKey: clePoolTournoi(tournoiId),
    queryFn: () => api<JoueurPoolTournoi[]>(`/tournois/${tournoiId}/joueurs`),
  })
}

// Par idKoko, jamais par id numerique brut — c'est l'identifiant que
// l'ADMIN manipule humainement (voir assignerJoueurSchema).
export function useAssignerJoueur(tournoiId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (idKoko: string) => api(`/tournois/${tournoiId}/joueurs`, { methode: 'POST', corps: { idKoko } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clePoolTournoi(tournoiId) })
      // Le compteur "Licences" de la liste (GET /tournois) doit refleter
      // le pool a jour, sans attendre un rechargement de page.
      queryClient.invalidateQueries({ queryKey: CLE_TOURNOIS })
    },
  })
}

export function useDesassignerJoueur(tournoiId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (joueurId: number) => api(`/tournois/${tournoiId}/joueurs/${joueurId}`, { methode: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clePoolTournoi(tournoiId) })
      queryClient.invalidateQueries({ queryKey: CLE_TOURNOIS })
    },
  })
}

export function useModifierTournoi(tournoiId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (donnees: ModificationTournoi) =>
      api<TournoiAdmin>(`/tournois/${tournoiId}`, { methode: 'PUT', corps: donnees }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cleTournoi(tournoiId) })
      queryClient.invalidateQueries({ queryKey: CLE_TOURNOIS })
    },
  })
}

// Action protegee (code secret admin) — voir DialogueReattribuerOrganisateur.
export function useReattribuerOrganisateur(tournoiId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ organisateurId, codeAdmin }: { organisateurId: number; codeAdmin: string }) =>
      api(`/tournois/${tournoiId}/organisateur`, { methode: 'PUT', corps: { organisateurId, codeAdmin } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cleTournoi(tournoiId) })
      queryClient.invalidateQueries({ queryKey: CLE_TOURNOIS })
    },
  })
}
