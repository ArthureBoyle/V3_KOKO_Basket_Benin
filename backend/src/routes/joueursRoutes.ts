// ================================================
// ROUTES JOUEUR — "moi" seulement, jamais d'id en parametre.
// ================================================
import { Router } from "express";
import { getMonProfil, getMesEquipes, getMesMatchs } from "../controllers/joueurController";
import { verifierAuth } from "../middlewares/verifierAuth";
import { verifierRole } from "../middlewares/verifierRole";

const router = Router();

router.use(verifierAuth, verifierRole("JOUEUR"));

router.get("/moi", getMonProfil);
router.get("/moi/equipes", getMesEquipes);
router.get("/moi/matchs", getMesMatchs);

export default router;
