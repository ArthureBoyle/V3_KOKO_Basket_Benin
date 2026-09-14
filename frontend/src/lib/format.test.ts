import { describe, expect, it } from 'vitest'
import {
  formaterAge,
  formaterDateHeure,
  formaterJour,
  formaterMiseAJour,
  formaterNombre,
  heureBeninVersIso,
  isoVersHeureBenin,
  isoVersJour,
} from './format'

// Intl utilise des espaces insecables : on les normalise pour comparer.
const texte = (s: string) => s.replace(/[  ]/g, ' ')

describe('formatage', () => {
  it('jour du backend (minuit UTC) -> jour exact, jamais la veille', () => {
    expect(formaterJour('2027-06-01T00:00:00.000Z')).toBe('1 juin 2027')
    expect(formaterJour('2027-12-31T00:00:00.000Z')).toBe('31 décembre 2027')
  })

  it("instant d'un match -> heure du Benin (UTC+1)", () => {
    expect(texte(formaterDateHeure('2027-08-05T17:00:00.000Z'))).toBe('5 août 2027 à 18:00')
  })

  it('nombres et ages en francais', () => {
    expect(texte(formaterNombre(1234))).toBe('1 234')
    expect(formaterAge(0)).toBe('0 an')
    expect(formaterAge(1)).toBe('1 an')
    expect(formaterAge(25)).toBe('25 ans')
  })

  it('mise a jour : a l\'instant, en minutes, puis heure', () => {
    const t = Date.UTC(2027, 7, 5, 17, 0, 0)
    expect(formaterMiseAJour(t, t + 30_000)).toBe("Mis à jour à l'instant")
    expect(formaterMiseAJour(t + 5_000, t)).toBe("Mis à jour à l'instant")
    expect(formaterMiseAJour(t, t + 5 * 60_000)).toBe('Mis à jour il y a 5 min')
    expect(texte(formaterMiseAJour(t, t + 3 * 3_600_000))).toBe('Mis à jour à 18:00')
  })

  it('saisie datetime-local -> ISO avec fuseau du Benin (format exige par le backend)', () => {
    expect(heureBeninVersIso('2027-08-05T18:00')).toBe('2027-08-05T18:00:00+01:00')
    expect(heureBeninVersIso('2027-08-05T18:00:30')).toBe('2027-08-05T18:00:30+01:00')
    expect(() => heureBeninVersIso('05/08/2027 18:00')).toThrow()
  })

  it('aller-retour saisie -> ISO -> saisie sans decalage', () => {
    const iso = heureBeninVersIso('2027-08-05T18:00')
    expect(new Date(iso).toISOString()).toBe('2027-08-05T17:00:00.000Z')
    expect(isoVersHeureBenin(iso)).toBe('2027-08-05T18:00')
    expect(isoVersHeureBenin('2027-08-05T23:30:00.000Z')).toBe('2027-08-06T00:30')
  })

  it('jour du backend -> valeur de <input type="date">', () => {
    expect(isoVersJour('2027-06-01T00:00:00.000Z')).toBe('2027-06-01')
  })
})
