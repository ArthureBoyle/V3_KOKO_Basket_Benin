// ================================================
// CHEVAUCHEMENT TOURNOI — un organisateur ne peut pas avoir deux tournois
// (non annules) sur la meme periode. Une seule regle, verifiee a quatre
// endroits : creation, modification des dates, reactivation, reattribution.
// ================================================
import prisma from "./prisma";

export async function trouverChevauchement(
  organisateurId: number,
  dateDebut: Date,
  dateFin: Date,
  tournoiIdExclu?: number
) {
  return prisma.tournoi.findFirst({
    where: {
      organisateurId,
      // Un tournoi ANNULE ne bloque jamais une periode.
      statut: { not: "ANNULE" },
      dateDebut: { lte: dateFin },
      dateFin: { gte: dateDebut },
      // Un tournoi qu'on modifie chevauche forcement ses propres dates.
      ...(tournoiIdExclu !== undefined ? { id: { not: tournoiIdExclu } } : {}),
    },
  });
}
