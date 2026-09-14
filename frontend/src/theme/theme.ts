// ================================================
// THEME — les 3 themes KOKO et leur application.
// Le theme n'est qu'un attribut data-theme sur <html> : le navigateur
// repeint seul, aucun re-render React. Memes valeurs et meme cle que le
// script anti-flash de index.html : les modifier aux deux endroits.
// ================================================
export const THEMES = [
  { id: 'violet', libelle: 'Violet nuit' },
  { id: 'terre', libelle: 'Beige & terre' },
  { id: 'menthe', libelle: 'Fluo menthe' },
] as const

export type Theme = (typeof THEMES)[number]['id']

export const THEME_PAR_DEFAUT: Theme = 'violet'
const CLE_STOCKAGE = 'koko-theme'

export function estTheme(valeur: unknown): valeur is Theme {
  return THEMES.some((theme) => theme.id === valeur)
}

// Lit le theme deja pose par le script anti-flash.
export function lireTheme(): Theme {
  const actuel = document.documentElement.dataset.theme
  return estTheme(actuel) ? actuel : THEME_PAR_DEFAUT
}

export function appliquerTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(CLE_STOCKAGE, theme)
  } catch {
    // Stockage indisponible (navigation privee) : le theme s'applique
    // quand meme, il ne sera simplement pas retenu au prochain chargement.
  }
}
