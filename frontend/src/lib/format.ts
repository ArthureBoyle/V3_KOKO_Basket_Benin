// ================================================
// FORMATAGE — dates, ages, nombres, en francais.
// KOKO se joue au Benin : les heures s'affichent et se saisissent a
// l'heure du Benin (Africa/Porto-Novo, UTC+1 toute l'annee, sans heure
// d'ete), quel que soit le fuseau de l'ordinateur utilise.
// ================================================
export const FUSEAU_BENIN = 'Africa/Porto-Novo'
const DECALAGE_BENIN = '+01:00'
const UNE_HEURE_MS = 60 * 60 * 1000

const formatJour = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const formatDateHeure = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: FUSEAU_BENIN,
})

const formatHeure = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: FUSEAU_BENIN,
})

const formatNombre = new Intl.NumberFormat('fr-FR')

// Jour calendaire (tournoi, date de naissance). Le backend renvoie minuit
// UTC ("2027-06-01T00:00:00.000Z") : lu en UTC, il ne glisse jamais d'un jour.
export function formaterJour(valeur: string | Date): string {
  return formatJour.format(new Date(valeur))
}

// Instant precis (match), affiche a l'heure du Benin.
export function formaterDateHeure(valeur: string | Date): string {
  return formatDateHeure.format(new Date(valeur))
}

export function formaterNombre(nombre: number): string {
  return formatNombre.format(nombre)
}

export function formaterAge(age: number): string {
  return `${age} an${age > 1 ? 's' : ''}`
}

// Texte a cote du bouton de rafraichissement.
export function formaterMiseAJour(horodatage: number, maintenant: number): string {
  const secondes = Math.floor((maintenant - horodatage) / 1000)
  if (secondes < 60) return "Mis à jour à l'instant"
  const minutes = Math.floor(secondes / 60)
  if (minutes < 60) return `Mis à jour il y a ${minutes} min`
  return `Mis à jour à ${formatHeure.format(horodatage)}`
}

// <input type="datetime-local"> donne "2027-08-05T18:00" SANS fuseau, alors
// que le backend en exige un : la saisie est lue comme heure du Benin.
export function heureBeninVersIso(valeurLocale: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(valeurLocale)) {
    throw new Error(`Date et heure invalides : "${valeurLocale}"`)
  }
  const avecSecondes = valeurLocale.length === 16 ? `${valeurLocale}:00` : valeurLocale
  return `${avecSecondes}${DECALAGE_BENIN}`
}

// Inverse, pour pre-remplir un champ : instant ISO -> "YYYY-MM-DDTHH:mm" au Benin.
export function isoVersHeureBenin(iso: string): string {
  return new Date(new Date(iso).getTime() + UNE_HEURE_MS).toISOString().slice(0, 16)
}

// Jour renvoye par le backend -> valeur d'un <input type="date">.
export function isoVersJour(iso: string): string {
  return iso.slice(0, 10)
}
