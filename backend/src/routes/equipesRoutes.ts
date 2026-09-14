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
  supprimerEquipe,
  uploaderLogo,
} from "../controllers/equipeController";
import { verifierAuth } from "../middlewares/verifierAuth";
import { verifierRole } from "../middlewares/verifierRole";
import { limiteurUpload } from "../middlewares/limiteurUpload";
import { uploadMiddleware } from "../utils/uploadImage";

const router = Router();

router.use(verifierAuth);

router.post("/", verifierRole("ADMIN", "ORGANISATEUR"), creerEquipe);
router.get("/", verifierRole("ADMIN", "ORGANISATEUR"), getEquipes);
router.get("/:id", verifierRole("ADMIN", "ORGANISATEUR"), getEquipeById);
router.delete("/:id", verifierRole("ADMIN", "ORGANISATEUR"), supprimerEquipe);

router.post("/:id/joueurs", verifierRole("ADMIN", "ORGANISATEUR"), ajouterJoueur);
router.delete("/:id/joueurs/:joueurId", verifierRole("ADMIN", "ORGANISATEUR"), retirerJoueur);

router.put("/:id/logo", verifierRole("ADMIN", "ORGANISATEUR"), limiteurUpload, uploadMiddleware.single("logo"), uploaderLogo);

export default router;
