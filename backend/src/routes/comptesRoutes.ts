// ================================================
// ROUTES COMPTES — ADMIN seulement, sans exception
// ================================================
import { Router } from "express";
import {
  getComptes,
  creerOrganisateur,
  creerJoueur,
  desactiverCompte,
  reactiverCompte,
} from "../controllers/compteController";
import { verifierAuth } from "../middlewares/verifierAuth";
import { verifierRole } from "../middlewares/verifierRole";

const router = Router();

router.use(verifierAuth, verifierRole("ADMIN"));

router.get("/", getComptes);
router.post("/organisateur", creerOrganisateur);
router.post("/joueur", creerJoueur);
router.put("/:id/desactiver", desactiverCompte);
router.put("/:id/reactiver", reactiverCompte);

export default router;
