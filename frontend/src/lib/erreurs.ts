import { ApiError } from '../api/client'

// Message a afficher pour une erreur d'appel API. Pour 400 et 403, le
// message du backend est le plus precis (ex. "Nombre maximal d'equipes
// atteint pour ce tournoi") : on le garde.
export function messageErreurApi(erreur: unknown): string {
  if (!(erreur instanceof ApiError)) return "Erreur inattendue de l'application."
  if (erreur.status === 0) return 'Serveur injoignable. Vérifie ta connexion et réessaie.'
  if (erreur.status === 401) return 'Ta session a expiré. Reconnecte-toi.'
  if (erreur.status === 404) return 'Élément introuvable : il a peut-être été supprimé.'
  if (erreur.status === 429) return 'Trop de tentatives. Réessaie dans quelques minutes.'
  if (erreur.status >= 500) return 'Le serveur a rencontré un problème. Réessaie dans un instant.'
  return erreur.message
}
