// ================================================
// ROUTES EQUIPES
// ================================================
import { Router } from "express";
import {
  creerEquipe,
  getEquipes,
  getEquipeById,
  ajouterJoueur,
  retirerJoueur,
  changerStatutJoueur,
  supprimerEquipe,
} from "../controllers/equipeController";
import { verifierAuth } from "../middlewares/verifierAuth";
import { verifierRole } from "../middlewares/verifierRole";

const router = Router();

router.use(verifierAuth);

router.post("/", verifierRole("ADMIN", "ORGANISATEUR"), creerEquipe);
router.get("/", verifierRole("ADMIN", "ORGANISATEUR"), getEquipes);
router.get("/:id", verifierRole("ADMIN", "ORGANISATEUR"), getEquipeById);
router.delete("/:id", verifierRole("ADMIN", "ORGANISATEUR"), supprimerEquipe);

router.post("/:id/joueurs", verifierRole("ADMIN", "ORGANISATEUR"), ajouterJoueur);
router.delete("/:id/joueurs/:joueurId", verifierRole("ADMIN", "ORGANISATEUR"), retirerJoueur);
router.put("/:id/joueurs/:joueurId/statut", verifierRole("ADMIN"), changerStatutJoueur);

export default router;
