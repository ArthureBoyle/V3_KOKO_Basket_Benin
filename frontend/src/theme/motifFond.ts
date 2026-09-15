// ================================================
// MOTIF DE FOND — texture tres subtile sur le fond principal des 3
// espaces (jamais sur les cartes/surfaces, qui restent opaques par-dessus).
// Meme mecanique que le theme (localStorage + lecture initiale), mais SANS
// script anti-flash : contrairement au theme, une texture decorative qui
// apparait une fraction de seconde apres le premier rendu n'est pas genante.
// ================================================
export const MOTIFS_FOND = [
  { id: 'losange', libelle: 'Tissage (losanges)' },
  { id: 'ballons', libelle: 'Ballons' },
  { id: 'terrain', libelle: 'Terrain (lignes de raquette)' },
] as const

export type MotifFond = (typeof MOTIFS_FOND)[number]['id']

export const MOTIF_PAR_DEFAUT: MotifFond = 'losange'
const CLE_STOCKAGE = 'koko-motif-fond'

export function estMotifFond(valeur: unknown): valeur is MotifFond {
  return MOTIFS_FOND.some((motif) => motif.id === valeur)
}

export function lireMotifFond(): MotifFond {
  try {
    const valeur = localStorage.getItem(CLE_STOCKAGE)
    return estMotifFond(valeur) ? valeur : MOTIF_PAR_DEFAUT
  } catch {
    return MOTIF_PAR_DEFAUT
  }
}

export function memoriserMotifFond(motif: MotifFond) {
  try {
    localStorage.setItem(CLE_STOCKAGE, motif)
  } catch {
    // Stockage indisponible (navigation privee) : le choix s'applique quand
    // meme pour cette session, simplement pas retenu au prochain chargement.
  }
}
