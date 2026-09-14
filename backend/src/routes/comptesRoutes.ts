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
import { limiteurCodeAdmin } from "../middlewares/limiteurCodeAdmin";
import { verifierCodeAdmin } from "../middlewares/verifierCodeAdmin";

const router = Router();

router.use(verifierAuth, verifierRole("ADMIN"));

router.get("/", getComptes);
router.post("/organisateur", creerOrganisateur);
router.post("/joueur", creerJoueur);
// Actions sensibles : session ADMIN + code secret admin (body.codeAdmin).
router.put("/:id/desactiver", limiteurCodeAdmin, verifierCodeAdmin, desactiverCompte);
router.put("/:id/reactiver", reactiverCompte);

export default router;
