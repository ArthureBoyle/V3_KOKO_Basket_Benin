// ================================================
// ROUTES COMPTES — ADMIN seulement, sans exception
// ================================================
import { Router } from "express";
import { validerIdParam } from "../middlewares/validerIdParam";
import {
  getComptes,
  getCompteById,
  creerOrganisateur,
  creerJoueur,
  desactiverCompte,
  reactiverCompte,
  modifierCompte,
  modifierEmailReel,
  reinitialiserMotDePasse,
  retirerAvatar,
} from "../controllers/compteController";
import { verifierAuth } from "../middlewares/verifierAuth";
import { verifierRole } from "../middlewares/verifierRole";
import { limiteurCodeAdmin } from "../middlewares/limiteurCodeAdmin";
import { verifierCodeAdmin } from "../middlewares/verifierCodeAdmin";

const router = Router();
router.param("id", validerIdParam);
router.param("joueurId", validerIdParam);

router.use(verifierAuth, verifierRole("ADMIN"));

router.get("/", getComptes);
router.get("/:id", getCompteById);
router.post("/organisateur", creerOrganisateur);
router.post("/joueur", creerJoueur);
router.put("/:id", modifierCompte);
router.put("/:id/reactiver", reactiverCompte);

// Actions sensibles : session ADMIN + code secret admin (body.codeAdmin).
router.put("/:id/desactiver", limiteurCodeAdmin, verifierCodeAdmin, desactiverCompte);
router.put("/:id/retirer-avatar", limiteurCodeAdmin, verifierCodeAdmin, retirerAvatar);
router.put("/:id/email-reel", limiteurCodeAdmin, verifierCodeAdmin, modifierEmailReel);
router.put(
  "/:id/reinitialiser-mot-de-passe",
  limiteurCodeAdmin,
  verifierCodeAdmin,
  reinitialiserMotDePasse
);

export default router;
