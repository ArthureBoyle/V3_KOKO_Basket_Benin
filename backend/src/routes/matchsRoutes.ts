// ================================================
// ROUTES MATCHS
// ================================================
import { Router } from "express";
import {
  creerMatch,
  getMatchs,
  getMatchById,
  modifierMatch,
  saisirScore,
  annulerMatch,
  reactiverMatch,
  reporterMatch,
  reprogrammerMatch,
} from "../controllers/matchController";
import { saisirStat, getStats, supprimerStat } from "../controllers/statController";
import { verifierAuth } from "../middlewares/verifierAuth";
import { verifierRole } from "../middlewares/verifierRole";

const router = Router();

router.use(verifierAuth);

router.post("/", verifierRole("ADMIN", "ORGANISATEUR"), creerMatch);
router.get("/", verifierRole("ADMIN", "ORGANISATEUR"), getMatchs);
router.get("/:id", verifierRole("ADMIN", "ORGANISATEUR"), getMatchById);
router.put("/:id", verifierRole("ADMIN", "ORGANISATEUR"), modifierMatch);
router.put("/:id/score", verifierRole("ADMIN", "ORGANISATEUR"), saisirScore);
router.put("/:id/annuler", verifierRole("ADMIN", "ORGANISATEUR"), annulerMatch);
router.put("/:id/reactiver", verifierRole("ADMIN", "ORGANISATEUR"), reactiverMatch);
router.put("/:id/reporter", verifierRole("ADMIN", "ORGANISATEUR"), reporterMatch);
router.put("/:id/reprogrammer", verifierRole("ADMIN", "ORGANISATEUR"), reprogrammerMatch);

router.get("/:id/stats", verifierRole("ADMIN", "ORGANISATEUR"), getStats);
router.put("/:id/stats/:joueurId", verifierRole("ADMIN", "ORGANISATEUR"), saisirStat);
router.delete("/:id/stats/:joueurId", verifierRole("ADMIN"), supprimerStat);

export default router;
