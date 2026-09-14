// ================================================
// TRI — fonctions pures utilisees par le Tableau (testees a part).
// ================================================
export type SensTri = 'asc' | 'desc'

// Ne modifie jamais le tableau recu. Tri stable : a egalite, l'ordre
// d'origine est garde.
export function trierLignes<T>(lignes: readonly T[], comparer: (a: T, b: T) => number, sens: SensTri): T[] {
  return [...lignes].sort((a, b) => (sens === 'asc' ? comparer(a, b) : comparer(b, a)))
}

// Ordre alphabetique francais : accents et majuscules ignores (Émile
// entre Dossou et Fagla, pas apres Zinsou).
export function comparerTexte(a: string, b: string): number {
  return a.localeCompare(b, 'fr', { sensitivity: 'base' })
}

export function comparerNombre(a: number, b: number): number {
  return a - b
}
