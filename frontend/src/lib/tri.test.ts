import { describe, expect, it } from 'vitest'
import { comparerNombre, comparerTexte, trierLignes } from './tri'

describe('tri', () => {
  const joueurs = [
    { nom: 'Zinsou', points: 12 },
    { nom: 'Émile', points: 30 },
    { nom: 'dossou', points: 12 },
    { nom: 'Fagla', points: 5 },
  ]

  it('texte en ordre francais : accents et majuscules ignores', () => {
    const noms = trierLignes(joueurs, (a, b) => comparerTexte(a.nom, b.nom), 'asc').map((j) => j.nom)
    expect(noms).toEqual(['dossou', 'Émile', 'Fagla', 'Zinsou'])
  })

  it('nombres croissants puis decroissants', () => {
    const asc = trierLignes(joueurs, (a, b) => comparerNombre(a.points, b.points), 'asc').map((j) => j.points)
    const desc = trierLignes(joueurs, (a, b) => comparerNombre(a.points, b.points), 'desc').map((j) => j.points)
    expect(asc).toEqual([5, 12, 12, 30])
    expect(desc).toEqual([30, 12, 12, 5])
  })

  it("tri stable : a egalite, l'ordre d'origine est garde", () => {
    const egalite = trierLignes(joueurs, (a, b) => comparerNombre(a.points, b.points), 'asc')
      .filter((j) => j.points === 12)
      .map((j) => j.nom)
    expect(egalite).toEqual(['Zinsou', 'dossou'])
  })

  it('ne modifie pas le tableau recu', () => {
    const avant = joueurs.map((j) => j.nom)
    trierLignes(joueurs, (a, b) => comparerTexte(a.nom, b.nom), 'desc')
    expect(joueurs.map((j) => j.nom)).toEqual(avant)
  })
})
