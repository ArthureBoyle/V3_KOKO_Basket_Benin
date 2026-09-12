// ================================================
// HELPERS DE TEST — partages entre tous les fichiers de tests
// ================================================

// Extrait juste "nom=valeur" d'une ligne Set-Cookie complete (qui
// contient aussi Path/Max-Age/Secure/... apres le premier ";").
export function cookieValue(setCookie: string[], nom: string): string {
  const ligne = setCookie.find((c) => c.startsWith(`${nom}=`));
  if (!ligne) throw new Error(`Cookie ${nom} introuvable dans la reponse`);
  return ligne.split(";")[0];
}
