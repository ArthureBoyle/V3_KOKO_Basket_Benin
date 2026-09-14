// ================================================
// CLIENT API — le SEUL point de passage vers le backend.
//
// - credentials: "include" : les tokens vivent dans des cookies httpOnly
//   que le front ne lit jamais (un script injecte ne peut pas les voler).
//   Sans cette option, le navigateur ne les enverrait pas.
// - Deballe l'enveloppe {success, data} / {success:false, error}.
// - Sur 401 : UN SEUL POST /auth/refresh, partage par toutes les requetes
//   qui echouent au meme moment, puis chaque requete est rejouee une fois.
//   Si le refresh echoue, l'erreur 401 remonte (voir lib/queryClient.ts).
// ================================================
import type { ReponseApi } from '../types/api'

export class ApiError extends Error {
  readonly status: number

  // status 0 = serveur injoignable (reseau coupe, backend arrete).
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type Methode = 'GET' | 'POST' | 'PUT' | 'DELETE'

export interface OptionsRequete {
  methode?: Methode
  corps?: unknown
  // Pour le login : un 401 y veut dire "mauvais identifiants", pas
  // "session expiree" — tenter un refresh n'aurait aucun sens.
  sansRafraichissement?: boolean
}

let rafraichissementEnCours: Promise<boolean> | null = null

function rafraichirSession(base: string): Promise<boolean> {
  rafraichissementEnCours ??= fetch(`${base}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then((reponse) => reponse.ok)
    .catch(() => false)
    .finally(() => {
      rafraichissementEnCours = null
    })
  return rafraichissementEnCours
}

function urlApi(): string {
  const base = import.meta.env.VITE_API_URL
  if (!base) {
    throw new Error('VITE_API_URL manquant : voir frontend/.env.example')
  }
  return base
}

export async function api<T>(chemin: string, options: OptionsRequete = {}): Promise<T> {
  const base = urlApi()
  const { methode = 'GET', corps, sansRafraichissement = false } = options

  const envoyer = async () => {
    try {
      return await fetch(`${base}${chemin}`, {
        method: methode,
        credentials: 'include',
        headers: corps === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: corps === undefined ? undefined : JSON.stringify(corps),
      })
    } catch {
      throw new ApiError(0, 'Serveur injoignable')
    }
  }

  let reponse = await envoyer()

  if (reponse.status === 401 && !sansRafraichissement) {
    const rafraichi = await rafraichirSession(base)
    if (rafraichi) reponse = await envoyer()
  }

  const contenu = (await reponse.json().catch(() => null)) as ReponseApi<T> | null

  if (!reponse.ok || !contenu || !contenu.success) {
    const message = contenu && !contenu.success ? contenu.error : 'Reponse inattendue du serveur'
    throw new ApiError(reponse.status, message)
  }

  return contenu.data
}
