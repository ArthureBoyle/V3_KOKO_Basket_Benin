// ================================================
// QUERY CLIENT — configuration unique de TanStack Query.
// ================================================
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import { CLE_SESSION } from '../features/auth/session'

// Un 401 qui arrive jusqu'ici veut dire que le refresh a deja echoue
// (voir api/client.ts) : la session est morte. On la vide, et les gardes
// de routes renvoient d'elles-memes vers la connexion.
function gererErreur(erreur: unknown) {
  if (erreur instanceof ApiError && erreur.status === 401) {
    queryClient.setQueryData(CLE_SESSION, null)
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: gererErreur }),
  mutationCache: new MutationCache({ onError: gererErreur }),
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      // Reessayer n'a de sens que pour un souci reseau ou serveur : un
      // 400/403/404 donnera la meme reponse a chaque essai.
      retry: (tentatives, erreur) => {
        if (erreur instanceof ApiError && erreur.status >= 400 && erreur.status < 500) return false
        return tentatives < 2
      },
    },
  },
})
