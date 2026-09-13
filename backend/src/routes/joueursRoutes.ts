// ================================================
// ROUTES JOUEUR — "moi" seulement, jamais d'id en parametre.
// ================================================
import { Router } from "express";
import { getMonProfil, getMesEquipes, getMesMatchs, uploaderAvatar } from "../controllers/joueurController";
import { verifierAuth } from "../middlewares/verifierAuth";
import { verifierRole } from "../middlewares/verifierRole";
import { limiteurUpload } from "../middlewares/limiteurUpload";
import { uploadMiddleware } from "../utils/uploadImage";

const router = Router();

router.use(verifierAuth, verifierRole("JOUEUR"));

router.get("/moi", getMonProfil);
router.get("/moi/equipes", getMesEquipes);
router.get("/moi/matchs", getMesMatchs);
router.put("/moi/avatar", limiteurUpload, uploadMiddleware.single("avatar"), uploaderAvatar);

export default router;
