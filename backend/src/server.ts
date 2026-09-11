// ================================================
// SERVER.TS — point d'entree du backend KOKO V3
// ================================================
// Version minimale : pas encore de Prisma (prisma/schema.prisma est
// toujours vide), pas encore de routes metier, pas encore d'errorHandler
// centralise. Juste de quoi verifier que le squelette tourne.

import dotenv from "dotenv";
// dotenv.config() DOIT etre la toute premiere chose executee qui touche
// a l'environnement : tout ce qui suit et qui lit process.env (le port,
// plus tard l'origine du frontend, le secret JWT...) depend de cet appel
// ayant deja charge le fichier .env avant d'etre lu.
dotenv.config();

import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import prisma from "./utils/prisma";

const app = express();

// ── Middlewares globaux, dans cet ordre ──────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true, // deja pose pour le cookie JWT a venir, meme si rien ne l'utilise encore
  })
);
app.use(express.json());
app.use(cookieParser());

// ── Route d'infrastructure ────────────────────────
// Volontairement hors de la convention reponseSucces/reponseErreur :
// un healthcheck externe (Docker, monitoring) attend une forme simple
// et stable, pas l'enveloppe success/data de l'API metier.
//
// Verifie maintenant reellement la base (le client Prisma existe depuis
// que le schema est ecrit et migre) — avant, /health mentait un peu en
// repondant "ok" sans jamais interroger quoi que ce soit.
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok", database: "connected" });
  } catch (error) {
    res.status(503).json({ status: "degraded", database: "unreachable" });
  }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`KOKO V3 backend lance sur http://localhost:${PORT}`);
});
