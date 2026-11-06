// Prefixe de l'espace administrateur, volontairement PAS "/admin" : cette
// adresse devinable est la premiere chose qu'un attaquant essaie. Le chemin
// vient de l'environnement (VITE_ADMIN_PATH) et n'est jamais commite.
//
// Ce n'est qu'un rideau de fumee : la vraie protection reste cote serveur
// (session + role ADMIN + code secret sur les actions sensibles). Et une
// variable VITE_* finit dans le JavaScript envoye au navigateur — le chemin
// n'est donc pas secret, juste introuvable "au hasard".
const valeur = import.meta.env.VITE_ADMIN_PATH

if (!valeur || !/^\/[A-Za-z0-9_-]{16,}$/.test(valeur)) {
  throw new Error(
    'VITE_ADMIN_PATH manquant ou invalide (ex. /k3f9a... , 16 caracteres minimum) : voir frontend/.env.example',
  )
}

export const CHEMIN_ADMIN: string = valeur
