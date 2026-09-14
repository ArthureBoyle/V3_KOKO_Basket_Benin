// ================================================
// TESTS — client API (fetch simule, aucun backend necessaire)
// ================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from './client'

const BASE = 'http://api.test'

const json = (status: number, corps: unknown) =>
  new Response(JSON.stringify(corps), { status, headers: { 'Content-Type': 'application/json' } })

function simulerFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  const faux = vi.fn(impl)
  vi.stubGlobal('fetch', faux)
  return faux
}

const appelsVers = (faux: ReturnType<typeof vi.fn>, fin: string) =>
  faux.mock.calls.filter(([url]) => String(url).endsWith(fin)).length

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', BASE)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('api()', () => {
  it("deballe l'enveloppe et envoie les cookies + le JSON", async () => {
    const faux = simulerFetch(async () => json(200, { success: true, data: { id: 7 } }))

    const data = await api<{ id: number }>('/tournois', { methode: 'POST', corps: { nom: 'Cup' } })

    expect(data).toEqual({ id: 7 })
    const [url, init] = faux.mock.calls[0]
    expect(url).toBe(`${BASE}/tournois`)
    expect(init?.credentials).toBe('include')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe(JSON.stringify({ nom: 'Cup' }))
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' })
  })

  it('erreur du backend -> ApiError avec le statut et le message', async () => {
    simulerFetch(async () => json(404, { success: false, error: 'Tournoi introuvable' }))

    const erreur = await api('/tournois/9').catch((e: unknown) => e)

    expect(erreur).toBeInstanceOf(ApiError)
    expect((erreur as ApiError).status).toBe(404)
    expect((erreur as ApiError).message).toBe('Tournoi introuvable')
  })

  it('401 -> un refresh puis la requete est rejouee', async () => {
    let rafraichi = false
    const faux = simulerFetch(async (url) => {
      if (url.endsWith('/auth/refresh')) {
        rafraichi = true
        return json(200, { success: true, data: { message: 'Token rafraichi' } })
      }
      return rafraichi
        ? json(200, { success: true, data: ['ok'] })
        : json(401, { success: false, error: 'Session invalide ou expiree' })
    })

    const data = await api<string[]>('/matchs?tournoiId=1')

    expect(data).toEqual(['ok'])
    expect(appelsVers(faux, '/auth/refresh')).toBe(1)
    expect(appelsVers(faux, '/matchs?tournoiId=1')).toBe(2)
  })

  it('5 requetes en 401 au meme moment -> UN SEUL refresh', async () => {
    let rafraichi = false
    const faux = simulerFetch(async (url) => {
      if (url.endsWith('/auth/refresh')) {
        await new Promise((r) => setTimeout(r, 20))
        rafraichi = true
        return json(200, { success: true, data: { message: 'Token rafraichi' } })
      }
      return rafraichi
        ? json(200, { success: true, data: url })
        : json(401, { success: false, error: 'Session invalide ou expiree' })
    })

    const resultats = await Promise.all([1, 2, 3, 4, 5].map((n) => api<string>(`/equipes/${n}`)))

    expect(resultats).toHaveLength(5)
    expect(appelsVers(faux, '/auth/refresh')).toBe(1)
  })

  it('refresh refuse -> ApiError 401, la requete n\'est pas rejouee', async () => {
    const faux = simulerFetch(async (url) =>
      url.endsWith('/auth/refresh')
        ? json(401, { success: false, error: 'Session expiree, reconnecte-toi' })
        : json(401, { success: false, error: 'Session invalide ou expiree' }),
    )

    const erreur = await api('/auth/moi').catch((e: unknown) => e)

    expect((erreur as ApiError).status).toBe(401)
    expect(appelsVers(faux, '/auth/moi')).toBe(1)
  })

  it('sansRafraichissement (login) : un 401 ne declenche aucun refresh', async () => {
    const faux = simulerFetch(async () => json(401, { success: false, error: 'Identifiants invalides' }))

    const erreur = await api('/auth/login', {
      methode: 'POST',
      corps: { email: 'x@koko.bj', motDePasse: 'faux' },
      sansRafraichissement: true,
    }).catch((e: unknown) => e)

    expect((erreur as ApiError).status).toBe(401)
    expect(appelsVers(faux, '/auth/refresh')).toBe(0)
  })

  it('serveur injoignable -> ApiError statut 0', async () => {
    simulerFetch(async () => {
      throw new TypeError('Failed to fetch')
    })

    const erreur = await api('/auth/moi').catch((e: unknown) => e)

    expect((erreur as ApiError).status).toBe(0)
  })

  it('VITE_API_URL absent -> erreur explicite', async () => {
    vi.stubEnv('VITE_API_URL', '')
    await expect(api('/auth/moi')).rejects.toThrow('VITE_API_URL manquant')
  })
})
