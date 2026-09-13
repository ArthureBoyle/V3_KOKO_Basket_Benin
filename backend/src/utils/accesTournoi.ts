// ================================================
// ACCES TOURNOI — partage entre Equipe et Match (les deux appartiennent
// a un Tournoi et suivent la meme regle d'acces), jamais duplique.
// ================================================
import { Tournoi } from "@prisma/client";
import prisma from "./prisma";
import { calculerStatutTournoi } from "./tournoiStatut";

// Verifie l'acces a un tournoi (ADMIN ou proprietaire) — reponse 404
// generique dans tous les cas de refus, jamais 403, meme logique que sur
// /tournois lui-meme. Renvoie le tournoi deja fetche : les appelants qui
// en ont besoin ensuite ne doivent jamais le refetcher.
export async function verifierAccesTournoi(
  tournoiId: number,
  user: { userId: number; role: string }
): Promise<
  | { ok: true; estAdmin: boolean; statutCalcule: string; tournoi: Tournoi }
  | { ok: false; status: number; message: string }
> {
  const tournoi = await prisma.tournoi.findUnique({ where: { id: tournoiId } });
  if (!tournoi) return { ok: false, status: 404, message: "Tournoi introuvable" };

  const estAdmin = user.role === "ADMIN";
  const statutCalcule = calculerStatutTournoi(tournoi);

  if (!estAdmin) {
    const estProprietaire = tournoi.organisateurId === user.userId;
    if (!estProprietaire || statutCalcule === "ANNULE") {
      return { ok: false, status: 404, message: "Tournoi introuvable" };
    }
  }

  return { ok: true, estAdmin, statutCalcule, tournoi };
}

// Acces LECTURE SEULE au classement d'un tournoi — distinct expres de
// verifierAccesTournoi ci-dessus : un JOUEUR du pool ne doit avoir accces
// QU'A CA (jamais a la gestion equipes/matchs, reservee a ADMIN et
// ORGANISATEUR proprietaire via la fonction du dessus).
export async function verifierAccesLectureClassement(
  tournoiId: number,
  user: { userId: number; role: string }
): Promise<{ ok: true; tournoi: Tournoi } | { ok: false; status: number; message: string }> {
  const tournoi = await prisma.tournoi.findUnique({ where: { id: tournoiId } });
  if (!tournoi) return { ok: false, status: 404, message: "Tournoi introuvable" };

  if (user.role === "ADMIN") return { ok: true, tournoi };

  // ANNULE reste cache a tout le monde sauf l'ADMIN, meme regle que
  // partout ailleurs.
  if (calculerStatutTournoi(tournoi) === "ANNULE") {
    return { ok: false, status: 404, message: "Tournoi introuvable" };
  }

  if (user.role === "ORGANISATEUR") {
    if (tournoi.organisateurId !== user.userId) {
      return { ok: false, status: 404, message: "Tournoi introuvable" };
    }
    return { ok: true, tournoi };
  }

  if (user.role === "JOUEUR") {
    const joueur = await prisma.joueur.findUnique({ where: { userId: user.userId } });
    if (!joueur) return { ok: false, status: 404, message: "Tournoi introuvable" };

    const dansLePool = await prisma.tournoiJoueur.findUnique({
      where: { tournoiId_joueurId: { tournoiId, joueurId: joueur.id } },
    });
    if (!dansLePool) return { ok: false, status: 404, message: "Tournoi introuvable" };

    return { ok: true, tournoi };
  }

  return { ok: false, status: 404, message: "Tournoi introuvable" };
}
