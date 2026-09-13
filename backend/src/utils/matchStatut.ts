// ================================================
// STATUT MATCH — calcul dynamique, meme principe que tournoiStatut.ts
// mais des regles differentes : ANNULE et REPORTE sont DEFINITIFS
// (jamais recalcules, decides par un humain) ; TERMINE est pilote par
// la SAISIE DU SCORE, pas par l'horloge (on saisit un score APRES le
// match, jamais en direct) ; EN_RETARD ne coute rien (juste une
// comparaison de date, pas de champ duree).
// ================================================
export function calculerStatutMatch(match: {
  statut: string;
  date: Date;
  score1: number | null;
  score2: number | null;
}): string {
  if (match.statut === "ANNULE") return "ANNULE";
  if (match.statut === "REPORTE") return "REPORTE";
  if (match.score1 !== null && match.score2 !== null) return "TERMINE";

  const maintenant = new Date();
  if (maintenant < match.date) return "A_VENIR";
  return "EN_RETARD";
}

// Un match ANNULE, REPORTE (en attente de reprogrammation) ou TERMINE
// n'accepte plus de modification operationnelle (lieu/type/arbitre).
export function estMatchModifiable(statutCalcule: string): boolean {
  return statutCalcule === "A_VENIR" || statutCalcule === "EN_RETARD";
}
