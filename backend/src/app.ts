// ================================================
// APP.TS — construit l'app Express, SANS jamais l'ecouter sur un port
// ================================================
// Separe de server.ts expres : Supertest a besoin d'importer l'app seule,
// sans qu'aucun port ne soit deja ouvert, pour lui envoyer des requetes
// directement en memoire (rapide, aucun vrai reseau implique).

import dotenv from "dotenv";
dotenv.config();

import path from "path";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { openapiDocument } from "./docs/openapi";
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

// Sert les images uploadees (avatars/logos) telles quelles. Le
// Cross-Origin-Resource-Policy par defaut de helmet ("same-origin")
// bloquerait sinon le frontend (autre origine) de les charger via <img>.
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"), {
    setHeaders: (res) => res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"),
  })
);

// Doc interactive. On retire le Content-Security-Policy pose par
// helmet() plus haut UNIQUEMENT sur ce chemin : swagger-ui-express sert
// une page avec un <script> inline pour s'initialiser, que le CSP par
// defaut de helmet bloquerait sinon.
app.use(
  "/docs",
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.removeHeader("Content-Security-Policy");
    next();
  },
  swaggerUi.serve,
  swaggerUi.setup(openapiDocument)
);
app.get("/docs.json", (req, res) => res.json(openapiDocument));

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
