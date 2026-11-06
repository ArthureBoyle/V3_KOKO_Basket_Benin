// ================================================
// COMPTES — appels API (ADMIN). Un hook par action, comme features/auth.
// ================================================
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import type {
  Compte,
  CompteDetail,
  CompteJoueurCree,
  CompteOrganisateurCree,
  CreationJoueur,
  CreationOrganisateur,
  MotDePasseReinitialise,
} from '../../types/api'

export const CLE_COMPTES = ['comptes'] as const
export const cleCompte = (id: number) => ['comptes', id] as const

// activer=false : n'emet AUCUNE requete (GET /comptes est ADMIN
// "sans exception" cote backend — un ecran ouvert par un ORGANISATEUR
// qui reutilise ce hook, meme pour une fonctionnalite qu'il ne peut pas
// declencher, ne doit jamais causer de 403 voue d'avance).
export function useComptes(activer = true) {
  return useQuery({
    queryKey: CLE_COMPTES,
    queryFn: () => api<Compte[]>('/comptes'),
    enabled: activer,
  })
}

export function useCompte(id: number) {
  return useQuery({
    queryKey: cleCompte(id),
    queryFn: () => api<CompteDetail>(`/comptes/${id}`),
  })
}

export function useCreerOrganisateur() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (donnees: CreationOrganisateur) =>
      api<CompteOrganisateurCree>('/comptes/organisateur', { methode: 'POST', corps: donnees }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLE_COMPTES }),
  })
}

export function useCreerJoueur() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (donnees: CreationJoueur) =>
      api<CompteJoueurCree>('/comptes/joueur', { methode: 'POST', corps: donnees }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLE_COMPTES }),
  })
}

interface ModificationIdentite {
  nom?: string
  prenom?: string
  surnom?: string | null
  dateNaissance?: string
}

// PUT /comptes/:id — sans code secret.
export function useModifierCompte(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (donnees: ModificationIdentite) =>
      api(`/comptes/${id}`, { methode: 'PUT', corps: donnees }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLE_COMPTES })
      queryClient.invalidateQueries({ queryKey: cleCompte(id) })
    },
  })
}

export function useReactiverCompte() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<{ message: string }>(`/comptes/${id}/reactiver`, { methode: 'PUT' }),
    onSuccess: (_donnee, id) => {
      queryClient.invalidateQueries({ queryKey: CLE_COMPTES })
      queryClient.invalidateQueries({ queryKey: cleCompte(id) })
    },
  })
}

// Les 3 actions suivantes exigent le code secret admin (body.codeAdmin) :
// verifierCodeAdmin les protege cote backend, DialogueCodeAdmin cote front.

export function useDesactiverCompte(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (codeAdmin: string) =>
      api<{ message: string }>(`/comptes/${id}/desactiver`, { methode: 'PUT', corps: { codeAdmin } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLE_COMPTES })
      queryClient.invalidateQueries({ queryKey: cleCompte(id) })
    },
  })
}

// Moderation : retire la photo de profil d'un joueur (code admin requis).
export function useRetirerAvatar(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (codeAdmin: string) =>
      api<{ message: string }>(`/comptes/${id}/retirer-avatar`, { methode: 'PUT', corps: { codeAdmin } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLE_COMPTES })
      queryClient.invalidateQueries({ queryKey: cleCompte(id) })
    },
  })
}

export function useModifierEmailReel(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ emailReel, codeAdmin }: { emailReel: string; codeAdmin: string }) =>
      api(`/comptes/${id}/email-reel`, { methode: 'PUT', corps: { emailReel, codeAdmin } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLE_COMPTES })
      queryClient.invalidateQueries({ queryKey: cleCompte(id) })
    },
  })
}

export function useReinitialiserMotDePasse(id: number) {
  return useMutation({
    mutationFn: (codeAdmin: string) =>
      api<MotDePasseReinitialise>(`/comptes/${id}/reinitialiser-mot-de-passe`, {
        methode: 'PUT',
        corps: { codeAdmin },
      }),
  })
}
