// ================================================
// EQUIPES — appels API (ADMIN, dans le cadre d'un tournoi). Un hook par
// action, comme features/tournois/api.ts.
// ================================================
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import type { AjoutJoueurEquipe, CreationEquipe, Equipe, EquipeDetail } from '../../types/api'
import { CLE_TOURNOIS, cleTournoi, clePoolTournoi } from './api'

export const cleEquipes = (tournoiId: number) => ['equipes', { tournoiId }] as const
export const cleEquipe = (id: number) => ['equipes', id] as const

export function useEquipes(tournoiId: number) {
  return useQuery({
    queryKey: cleEquipes(tournoiId),
    queryFn: () => api<Equipe[]>(`/equipes?tournoiId=${tournoiId}`),
  })
}

// equipeId === null : dialogue ferme, aucune requete (voir DialogueEffectifEquipe).
export function useEquipe(equipeId: number | null) {
  return useQuery({
    queryKey: cleEquipe(equipeId ?? -1),
    queryFn: () => api<EquipeDetail>(`/equipes/${equipeId}`),
    enabled: equipeId !== null,
  })
}

export function useCreerEquipe(tournoiId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (donnees: CreationEquipe) =>
      api<Equipe>('/equipes', { methode: 'POST', corps: { ...donnees, tournoiId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cleEquipes(tournoiId) })
      // tournoi.equipes (fiche) sert a afficher le nom d'equipe dans
      // l'onglet Licences : sans cette invalidation, une equipe fraichement
      // creee resterait invisible la-bas jusqu'a un rechargement complet.
      queryClient.invalidateQueries({ queryKey: cleTournoi(tournoiId) })
      queryClient.invalidateQueries({ queryKey: CLE_TOURNOIS })
    },
  })
}

export function useSupprimerEquipe(tournoiId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (equipeId: number) => api(`/equipes/${equipeId}`, { methode: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cleEquipes(tournoiId) })
      queryClient.invalidateQueries({ queryKey: cleTournoi(tournoiId) })
      queryClient.invalidateQueries({ queryKey: CLE_TOURNOIS })
    },
  })
}

// joueurId vient forcement du pool deja scope (voir ajouterJoueurSchema
// cote backend) : jamais de recherche libre ici non plus.
export function useAjouterJoueurEquipe(equipeId: number, tournoiId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (donnees: AjoutJoueurEquipe) =>
      api(`/equipes/${equipeId}/joueurs`, { methode: 'POST', corps: donnees }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cleEquipe(equipeId) })
      // Le pool (onglet Licences) porte le champ equipeId de chaque
      // joueur : il change des qu'il rejoint une equipe.
      queryClient.invalidateQueries({ queryKey: clePoolTournoi(tournoiId) })
    },
  })
}

export function useRetirerJoueurEquipe(equipeId: number, tournoiId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (joueurId: number) => api(`/equipes/${equipeId}/joueurs/${joueurId}`, { methode: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cleEquipe(equipeId) })
      queryClient.invalidateQueries({ queryKey: clePoolTournoi(tournoiId) })
    },
  })
}

// FormData (voir api/client.ts) : jamais de JSON pour un fichier.
export function useUploaderLogoEquipe(equipeId: number, tournoiId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fichier: File) => {
      const corps = new FormData()
      corps.append('logo', fichier)
      return api<Equipe>(`/equipes/${equipeId}/logo`, { methode: 'PUT', corps })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cleEquipe(equipeId) })
      queryClient.invalidateQueries({ queryKey: cleEquipes(tournoiId) })
    },
  })
}
