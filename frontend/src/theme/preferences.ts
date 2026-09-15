// ================================================
// PREFERENCES — reglages manuels de l'utilisateur qui existent en plus du
// reglage systeme (contrairement au theme, qui n'a pas d'equivalent OS).
//
// Reduire les animations : certains PC faibles ralentissent avec les
// animations meme quand le reglage "mouvement reduit" du systeme
// d'exploitation n'est pas active (l'utilisateur n'a pas forcement acces a
// ce reglage, ou ne sait pas qu'il existe) — ce commutateur agit pareil,
// depuis l'application elle-meme. Meme cle et memes valeurs que le script
// anti-flash de index.html : les modifier aux deux endroits.
// ================================================
const CLE_STOCKAGE = 'koko-animations-reduites'
export const EVENEMENT_CHANGEMENT = 'koko-animations-reduites-changees'

export function lireAnimationsReduitesManuel(): boolean {
  try {
    return localStorage.getItem(CLE_STOCKAGE) === 'oui'
  } catch {
    return false
  }
}

export function appliquerAnimationsReduitesManuel(actif: boolean) {
  document.documentElement.dataset.animationsReduites = actif ? 'oui' : 'non'
  try {
    localStorage.setItem(CLE_STOCKAGE, actif ? 'oui' : 'non')
  } catch {
    // Stockage indisponible (navigation privee) : le reglage s'applique
    // quand meme, il ne sera simplement pas retenu au prochain chargement.
  }
  window.dispatchEvent(new Event(EVENEMENT_CHANGEMENT))
}
