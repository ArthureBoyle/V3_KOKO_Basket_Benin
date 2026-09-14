// ================================================
// JOUEUR CONTROLLER — routes "moi" pour un compte JOUEUR. Tout est
// scope strictement sur req.user.userId, jamais un id en parametre :
// impossible de consulter les donnees d'un autre joueur par ce chemin.
// ================================================
import { Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { AuthRequest } from "../middlewares/verifierAuth";
import { reponseSucces, reponseErreur } from "../utils/reponses";
import { calculerStatutTournoi } from "../utils/tournoiStatut";
import { calculerStatutMatch } from "../utils/matchStatut";
import { traiterEtEnregistrerImage, supprimerAncienneImage } from "../utils/uploadImage";

// GET /joueurs/moi — profil complet du joueur connecte.
export async function getMonProfil(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const joueur = await prisma.joueur.findUnique({
      where: { userId: req.user!.userId },
      select: { id: true, idKoko: true, nomLegal: true, prenom: true, surnom: true, dateNaissance: true, avatar: true },
    });
    if (!joueur) return reponseErreur(res, "Profil joueur introuvable", 404);

    return reponseSucces(res, joueur);
  } catch (err) {
    next(err);
  }
}

// GET /joueurs/moi/tournois — les tournois ou le joueur est CERTIFIE.
// Certifie = present dans le pool de licences du tournoi : l'ADMIN l'y a
// ajoute (licence payee, identite et age verifies). Pas de statut
// separe : le jour ou l'ADMIN le retire du pool, il n'est plus certifie
// et le tournoi disparait de cette liste. Un tournoi ANNULE n'apparait
// jamais (meme regle que pour l'organisateur) ; un TERMINE reste
// (historique). L'equipe est null tant que l'organisateur ne l'a pas
// encore place dans une equipe — il est deja certifie pour autant.
export async function getMesTournois(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const joueur = await prisma.joueur.findUnique({ where: { userId: req.user!.userId } });
    if (!joueur) return reponseErreur(res, "Profil joueur introuvable", 404);

    const [licences, inscriptions] = await Promise.all([
      prisma.tournoiJoueur.findMany({
        where: { joueurId: joueur.id },
        include: {
          tournoi: { select: { id: true, nom: true, lieu: true, statut: true, dateDebut: true, dateFin: true } },
        },
      }),
      prisma.equipeJoueur.findMany({
        where: { joueurId: joueur.id },
        include: { equipe: { select: { id: true, nom: true, couleur: true, logo: true } } },
      }),
    ]);

    const inscriptionParTournoi = new Map(inscriptions.map((i) => [i.tournoiId, i]));

    const resultat = licences
      .map((licence) => {
        const inscription = inscriptionParTournoi.get(licence.tournoiId);
        return {
          tournoi: { ...licence.tournoi, statut: calculerStatutTournoi(licence.tournoi) },
          equipe: inscription ? { ...inscription.equipe, numeroDeMaillot: inscription.numeroDeMaillot } : null,
        };
      })
      .filter((ligne) => ligne.tournoi.statut !== "ANNULE");

    return reponseSucces(res, resultat);
  } catch (err) {
    next(err);
  }
}

// GET /joueurs/moi/matchs?tournoiId= — calendrier des matchs de SA
// propre equipe pour ce tournoi (pas tout le tableau du tournoi).
export async function getMesMatchs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.query.tournoiId) {
      return reponseErreur(res, "tournoiId requis", 400);
    }
    const tournoiId = parseInt(String(req.query.tournoiId), 10);

    // Route deja reservee au role JOUEUR (voir joueursRoutes.ts) : pas
    // besoin de la fonction partagee multi-role ici, on ecrit l'equivalent
    // en ligne pour ne fetcher "joueur" qu'UNE SEULE fois.
    const joueur = await prisma.joueur.findUnique({ where: { userId: req.user!.userId } });
    if (!joueur) return reponseErreur(res, "Profil joueur introuvable", 404);

    const tournoi = await prisma.tournoi.findUnique({ where: { id: tournoiId } });
    if (!tournoi || calculerStatutTournoi(tournoi) === "ANNULE") {
      return reponseErreur(res, "Tournoi introuvable", 404);
    }

    const dansLePool = await prisma.tournoiJoueur.findUnique({
      where: { tournoiId_joueurId: { tournoiId, joueurId: joueur.id } },
    });
    if (!dansLePool) return reponseErreur(res, "Tournoi introuvable", 404);

    const appartenance = await prisma.equipeJoueur.findUnique({
      where: { tournoiId_joueurId: { tournoiId, joueurId: joueur.id } },
    });
    // Dans le pool mais pas encore place dans une equipe : calendrier
    // vide, pas une erreur.
    if (!appartenance) return reponseSucces(res, []);

    const matches = await prisma.match.findMany({
      where: {
        tournoiId,
        OR: [{ equipe1Id: appartenance.equipeId }, { equipe2Id: appartenance.equipeId }],
      },
      orderBy: { date: "asc" },
      include: {
        equipe1: { select: { id: true, nom: true, couleur: true } },
        equipe2: { select: { id: true, nom: true, couleur: true } },
      },
    });

    const enrichis = matches.map((match) => ({ ...match, statut: calculerStatutMatch(match) }));
    return reponseSucces(res, enrichis);
  } catch (err) {
    next(err);
  }
}

// PUT /joueurs/moi/avatar — remplace son propre avatar. Le fichier
// arrive deja en memoire (req.file.buffer) via uploadMiddleware, verifie
// et re-encode par traiterEtEnregistrerImage avant d'etre ecrit sur
// disque -- voir utils/uploadImage.ts.
export async function uploaderAvatar(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      return reponseErreur(res, "Aucun fichier envoye", 400);
    }

    const joueur = await prisma.joueur.findUnique({ where: { userId: req.user!.userId } });
    if (!joueur) return reponseErreur(res, "Profil joueur introuvable", 404);

    const cheminRelatif = await traiterEtEnregistrerImage(req.file.buffer, "joueurs");

    await supprimerAncienneImage(joueur.avatar);

    const misAJour = await prisma.joueur.update({
      where: { id: joueur.id },
      data: { avatar: cheminRelatif },
      select: { id: true, avatar: true },
    });

    return reponseSucces(res, misAJour);
  } catch (err) {
    next(err);
  }
}
