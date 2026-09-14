// ================================================
// AGE — calcule a partir de la date de naissance, jamais stocke (il
// deviendrait faux tout seul chaque annee). Calcul en UTC : les dates de
// naissance sont stockees en @db.Date (minuit UTC). Consequence
// acceptee : le jour de l'anniversaire, entre minuit et 1 h au Benin
// (UTC+1), l'age affiche a encore un an de moins.
// ================================================
export function calculerAge(dateNaissance: Date, maintenant: Date = new Date()): number {
  const age = maintenant.getUTCFullYear() - dateNaissance.getUTCFullYear();

  const moisActuel = maintenant.getUTCMonth();
  const moisNaissance = dateNaissance.getUTCMonth();
  const anniversairePasse =
    moisActuel > moisNaissance ||
    (moisActuel === moisNaissance && maintenant.getUTCDate() >= dateNaissance.getUTCDate());

  return anniversairePasse ? age : age - 1;
}
