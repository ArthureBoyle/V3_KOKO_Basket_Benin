// ================================================
// STATUT TOURNOI — calcul dynamique, partage entre plusieurs controllers
// (Tournoi lui-meme, Equipe, et plus tard Match) — jamais duplique.
// ================================================
// ANNULE est DEFINITIF, jamais recalcule. Pour tout le reste, jamais
// confiance a la valeur stockee : recalcule a CHAQUE appel, depuis les
// dates comparees a maintenant.
export function calculerStatutTournoi(tournoi: {
  statut: string;
  dateDebut: Date;
  dateFin: Date;
}): string {
  if (tournoi.statut === "ANNULE") return "ANNULE";
  const maintenant = new Date();
  if (maintenant < tournoi.dateDebut) return "A_VENIR";
  if (maintenant <= tournoi.dateFin) return "ACTIF";
  return "TERMINE";
}

// Un tournoi ANNULE ou TERMINE n'accepte plus aucune modification, ni
// sur lui-meme ni sur ce qui lui appartient (equipes, matchs...).
export function estTournoiModifiable(statutCalcule: string): boolean {
  return statutCalcule === "A_VENIR" || statutCalcule === "ACTIF";
}
