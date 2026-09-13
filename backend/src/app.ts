// ================================================
// APP.TS — construit l'app Express, SANS jamais l'ecouter sur un port
// ================================================
// Separe de server.ts expres : Supertest a besoin d'importer l'app seule,
// sans qu'aucun port ne soit deja ouvert, pour lui envoyer des requetes
// directement en memoire (rapide, aucun vrai reseau implique).

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import prisma from "./utils/prisma";
import authRoutes from "./routes/authRoutes";
import comptesRoutes from "./routes/comptesRoutes";
import tournoisRoutes from "./routes/tournoisRoutes";
import equipesRoutes from "./routes/equipesRoutes";
import matchsRoutes from "./routes/matchsRoutes";
import joueursRoutes from "./routes/joueursRoutes";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok", database: "connected" });
  } catch (error) {
    res.status(503).json({ status: "degraded", database: "unreachable" });
  }
});

app.use("/auth", authRoutes);
app.use("/comptes", comptesRoutes);
app.use("/tournois", tournoisRoutes);
app.use("/equipes", equipesRoutes);
app.use("/matchs", matchsRoutes);
app.use("/joueurs", joueursRoutes);

// errorHandler doit etre le DERNIER app.use() du fichier, apres toutes
// les routes — sinon les erreurs des routes montees apres lui ne
// l'atteignent jamais.
app.use(errorHandler);

export default app;
