// ================================================
// ROUTES AUTH
// ================================================
import { Router } from "express";
import { login, refresh, logout, moi } from "../controllers/authController";
import { verifierAuth } from "../middlewares/verifierAuth";
import { limiteurLogin } from "../middlewares/limiteurLogin";

const router = Router();

router.post("/login", limiteurLogin, login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/moi", verifierAuth, moi);

export default router;
