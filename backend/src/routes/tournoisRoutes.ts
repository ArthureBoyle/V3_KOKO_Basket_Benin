// ================================================
// ROUTES TOURNOIS
// ================================================
import { Router } from "express";
import {
  getTournois,
  getMesTournois,
  getTournoiById,
  creerTournoi,
  modifierTournoi,
  annulerTournoi,
  reactiverTournoi,
  assignerJoueur,
  desassignerJoueur,
  getJoueursDisponibles,
} from "../controllers/tournoiController";
import { getClassementJoueurs, getClassementEquipes } from "../controllers/classementController";
import { verifierAuth } from "../middlewares/verifierAuth";
import { verifierRole } from "../middlewares/verifierRole";

const router = Router();

router.use(verifierAuth);

// Route specifique AVANT /:id, sinon Express lirait "mes-tournois"
// comme une valeur de :id.
router.get("/mes-tournois", verifierRole("ORGANISATEUR"), getMesTournois);

router.get("/", verifierRole("ADMIN"), getTournois);
router.get("/:id", getTournoiById); // ADMIN ou proprietaire, verifie dans le controller
router.post("/", verifierRole("ADMIN"), creerTournoi);
router.put("/:id", verifierRole("ADMIN", "ORGANISATEUR"), modifierTournoi);
router.put("/:id/annuler", verifierRole("ADMIN"), annulerTournoi);
router.put("/:id/reactiver", verifierRole("ADMIN"), reactiverTournoi);

// Pool de licences (TournoiJoueur) — assignation reservee a l'ADMIN,
// lecture ouverte au proprietaire (verifiee dans le controller).
router.post("/:id/joueurs", verifierRole("ADMIN"), assignerJoueur);
router.delete("/:id/joueurs/:joueurId", verifierRole("ADMIN"), desassignerJoueur);
router.get("/:id/joueurs", verifierRole("ADMIN", "ORGANISATEUR"), getJoueursDisponibles);

router.get("/:id/classement", verifierRole("ADMIN", "ORGANISATEUR", "JOUEUR"), getClassementJoueurs);
router.get("/:id/classement-equipes", verifierRole("ADMIN", "ORGANISATEUR", "JOUEUR"), getClassementEquipes);

export default router;
