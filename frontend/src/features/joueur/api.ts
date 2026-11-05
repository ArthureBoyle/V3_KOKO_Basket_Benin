// ================================================
// JOUEUR — appels API ("moi" seulement, voir joueursRoutes.ts cote
// backend). Un hook par action, comme features/tournois/api.ts.
// ================================================
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import type { InscriptionJoueur, MatchJoueur, ProfilJoueur } from '../../types/api'

export const CLE_MON_PROFIL = ['joueur', 'moi'] as const
export const CLE_MES_TOURNOIS_JOUEUR = ['joueur', 'mes-tournois'] as const
export const cleMesMatchsJoueur = (tournoiId: number) => ['joueur', 'mes-matchs', tournoiId] as const

export function useMonProfil() {
  return useQuery({
    queryKey: CLE_MON_PROFIL,
    queryFn: () => api<ProfilJoueur>('/joueurs/moi'),
  })
}

export function useMesTournoisJoueur() {
  return useQuery({
    queryKey: CLE_MES_TOURNOIS_JOUEUR,
    queryFn: () => api<InscriptionJoueur[]>('/joueurs/moi/tournois'),
  })
}

// tournoiId === null : le joueur n'a pas encore choisi de tournoi
// (ecran liste), aucune requete.
export function useMesMatchsJoueur(tournoiId: number | null) {
  return useQuery({
    queryKey: cleMesMatchsJoueur(tournoiId ?? -1),
    queryFn: () => api<MatchJoueur[]>(`/joueurs/moi/matchs?tournoiId=${tournoiId}`),
    enabled: tournoiId !== null,
  })
}

// FormData (voir api/client.ts) : jamais de JSON pour un fichier.
export function useUploaderAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fichier: File) => {
      const corps = new FormData()
      corps.append('avatar', fichier)
      return api<{ id: number; avatar: string }>('/joueurs/moi/avatar', { methode: 'PUT', corps })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLE_MON_PROFIL }),
  })
}
