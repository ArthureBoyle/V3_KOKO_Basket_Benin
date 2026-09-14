import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/client'
import { messageErreurApi } from './erreurs'

describe('messageErreurApi', () => {
  it('statuts techniques -> message clair en francais', () => {
    expect(messageErreurApi(new ApiError(0, 'x'))).toContain('Serveur injoignable')
    expect(messageErreurApi(new ApiError(401, 'x'))).toContain('session a expiré')
    expect(messageErreurApi(new ApiError(404, 'Tournoi introuvable'))).toContain('introuvable')
    expect(messageErreurApi(new ApiError(429, 'x'))).toContain('Trop de tentatives')
    expect(messageErreurApi(new ApiError(503, 'x'))).toContain('problème')
  })

  it('400 / 403 : garde le message precis du backend', () => {
    expect(messageErreurApi(new ApiError(400, "Nombre maximal d'equipes atteint"))).toBe(
      "Nombre maximal d'equipes atteint",
    )
  })

  it("erreur qui n'est pas une ApiError -> message generique", () => {
    expect(messageErreurApi(new Error('boom'))).toBe("Erreur inattendue de l'application.")
  })
})
