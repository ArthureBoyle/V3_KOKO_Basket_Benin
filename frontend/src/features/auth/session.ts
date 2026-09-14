// ================================================
// SESSION — qui est connecte, connexion, deconnexion.
// La session vient TOUJOURS de GET /auth/moi (jamais d'un token lu cote
// front : les cookies sont httpOnly). null = personne n'est connecte.
// ================================================
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../../api/client'
import type { Identifiants, ReponseConnexion, Role, Utilisateur } from '../../types/api'

export const CLE_SESSION = ['session'] as const

export const ACCUEIL_PAR_ROLE: Record<Role, string> = {
  ADMIN: '/admin',
  ORGANISATEUR: '/organisateur',
  JOUEUR: '/joueur',
}

// Message quand on n'a pas pu savoir qui est connecte. "Serveur
// injoignable" seulement pour une vraie coupure reseau : l'afficher pour
// une erreur de l'application ferait chercher la panne au mauvais endroit.
export function messageErreurSession(erreur: unknown): string {
  if (erreur instanceof ApiError && erreur.status === 0) return 'Serveur injoignable.'
  if (erreur instanceof ApiError) return 'Le serveur a rencontré un problème. Réessaie dans un instant.'
  return "Erreur inattendue de l'application."
}

export function useSession() {
  return useQuery({
    queryKey: CLE_SESSION,
    queryFn: async (): Promise<Utilisateur | null> => {
      try {
        // Si l'access token a expire, api() tente d'abord un refresh.
        return await api<Utilisateur>('/auth/moi')
      } catch (erreur) {
        if (erreur instanceof ApiError && erreur.status === 401) return null
        throw erreur
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export function useConnexion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (identifiants: Identifiants) =>
      api<ReponseConnexion>('/auth/login', {
        methode: 'POST',
        corps: identifiants,
        sansRafraichissement: true,
      }),
    // La mutation reste "en cours" jusqu'a ce que la session soit relue :
    // pas de clignotement du formulaire avant la redirection.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLE_SESSION }),
  })
}

export function useDeconnexion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api<{ message: string }>('/auth/logout', { methode: 'POST', sansRafraichissement: true }),
    // Meme si l'appel echoue (reseau), on oublie tout cote front : aucune
    // donnee d'un compte ne doit rester en cache pour le suivant.
    // ORDRE IMPORTANT : d'abord la session a null (les gardes, abonnees a
    // cette requete, redirigent vers la connexion), PUIS on retire tout le
    // reste. Un queryClient.clear() retirerait aussi la requete de session :
    // les gardes resteraient abonnees a l'ancienne et ne verraient jamais
    // le null — la page ne redirigeait pas (constate en test navigateur).
    onSettled: () => {
      queryClient.setQueryData(CLE_SESSION, null)
      queryClient.removeQueries({ predicate: (requete) => requete.queryKey[0] !== CLE_SESSION[0] })
    },
  })
}
