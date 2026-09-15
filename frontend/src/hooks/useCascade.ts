// ================================================
// CASCADE D'APPARITION (motion system, section 3) : chaque carte d'une
// grille/liste apparait avec un decalage de 70ms, jamais toutes en meme
// temps. Plafond de 6 elements decales — au-dela, le dernier arrive trop
// tard, tous les elements suivants partagent le decalage du 6e.
//
// PAS ENCORE UTILISE (aucun ecran a cartes n'existe encore, voir
// CarteStatut.tsx). Prevu pour la liste des tournois / matchs.
// ================================================
const DECALAGE_MS = 70
const RANG_MAX = 6

// A poser en style inline sur chaque carte d'une liste : style={styleCascade(index)}
export function styleCascade(index: number): { animationDelay: string } {
  return { animationDelay: `${Math.min(index, RANG_MAX - 1) * DECALAGE_MS}ms` }
}

export const CLASSE_CASCADE = 'koko-cascade'
