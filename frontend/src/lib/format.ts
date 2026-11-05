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

// Version compacte de formaterDateHeure (mois abrege, sans "a") : carte
// de match, ou la date rejoint statut/poule/lieu sur une seule ligne.
const formatJourCourtBenin = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
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

// Jour abrege d'un match ("15 janv. 2026"), a l'heure du Benin (un match
// est un instant precis, contrairement au jour calendaire d'un tournoi).
export function formaterJourMatch(valeur: string | Date): string {
  return formatJourCourtBenin.format(new Date(valeur))
}

// Heure seule d'un match ("18:00"), a l'heure du Benin.
export function formaterHeureMatch(valeur: string | Date): string {
  return formatHeure.format(new Date(valeur))
}

export function formaterNombre(nombre: number): string {
  return formatNombre.format(nombre)
}

export function formaterAge(age: number): string {
  return `${age} an${age > 1 ? 's' : ''}`
}

// Nom affiche d'un joueur (surnom entre guillemets francais s'il existe) :
// utilise partout ou un joueur est identifie a l'ecran (RechercheJoueur,
// OngletLicences...), pour ne jamais retaper cette regle a chaque endroit.
export function formaterNomJoueur(joueur: { nom: string; prenom: string; surnom: string | null }): string {
  return `${joueur.prenom} ${joueur.nom}${joueur.surnom ? ` « ${joueur.surnom} »` : ''}`
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

// Le backend ne renvoie jamais qu'un chemin RELATIF ("joueurs/uuid.jpg",
// voir utils/uploadImage.ts cote backend) : jamais stocke tel quel dans
// un <img src>, toujours recompose avec l'origine de l'API (servi sur
// /uploads, voir app.ts).
export function urlImage(chemin: string): string {
  return `${import.meta.env.VITE_API_URL}/uploads/${chemin}`
}
