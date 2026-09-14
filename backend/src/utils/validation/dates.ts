// ================================================
// DATES — schemas partages par tous les validators.
// Regle : toujours valider le TEXTE recu avant de le convertir en Date.
// Un z.coerce.date() seul accepte null (new Date(null) = 1er janvier
// 1970), des nombres (timestamps) et des formats ambigus, sans jamais
// lever d'erreur — une date absente devenait silencieusement 1970.
// ================================================
import { z } from "zod";

// Jour calendaire "YYYY-MM-DD" (tournoi, date de naissance). z.iso.date
// verifie aussi le calendrier : "2027-02-30" est refuse.
export const jourSchema = z.iso.date().pipe(z.coerce.date());

// Instant precis, fuseau OBLIGATOIRE : "2027-08-05T18:00:00Z" ou
// "2027-08-05T19:00:00+01:00" (match). Sans fuseau, l'heure retenue
// dependrait du fuseau configure sur le serveur.
export const instantSchema = z.iso.datetime({ offset: true }).pipe(z.coerce.date());
