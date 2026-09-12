// ================================================
// TESTS D'INTEGRATION — module auth (login/refresh/logout/moi)
// ================================================
// Contre la vraie base Docker de dev (koko-postgres), pas une base mockee
// — on verifie le vrai comportement, y compris les vraies requetes Prisma.
// Comptes de test crees/supprimes par cette suite, jamais laisses en base.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import crypto from "crypto";
import app from "../../src/app";
import prisma from "../../src/utils/prisma";
import { hashToken } from "../../src/utils/tokens";

const EMAIL_ACTIF = "test9001@koko.bj";
const EMAIL_DESACTIVE = "test9002@koko.bj";
const MOT_DE_PASSE = "TestSuite123!";

// Extrait juste "nom=valeur" d'une ligne Set-Cookie complete (qui contient
// aussi Path/Max-Age/Secure/... apres le premier ";").
function cookieValue(setCookie: string[], nom: string): string {
  const ligne = setCookie.find((c) => c.startsWith(`${nom}=`));
  if (!ligne) throw new Error(`Cookie ${nom} introuvable dans la reponse`);
  return ligne.split(";")[0];
}

describe("Auth", () => {
  let userActifId: number;
  let userDesactiveId: number;
  let loginReponse: request.Response;
  let cookiesValides: string[];

  beforeAll(async () => {
    const hash = await bcrypt.hash(MOT_DE_PASSE, 10);

    const userActif = await prisma.user.create({
      data: {
        email: EMAIL_ACTIF,
        motDePasse: hash,
        role: "ORGANISATEUR",
        actif: true,
        mustChangePassword: false,
        nom: "Suite",
        prenom: "Test",
      },
    });
    userActifId = userActif.id;

    const userDesactive = await prisma.user.create({
      data: {
        email: EMAIL_DESACTIVE,
        motDePasse: hash,
        role: "ORGANISATEUR",
        actif: false,
        mustChangePassword: false,
        nom: "Suite",
        prenom: "Desactive",
      },
    });
    userDesactiveId = userDesactive.id;

    // Un seul login reussi ici, reutilise par plusieurs tests plus bas
    // (moi, refresh valide) - evite de multiplier les appels a
    // /auth/login, limite a 5 tentatives / 15 min par limiteurLogin.
    loginReponse = await request(app)
      .post("/auth/login")
      .send({ email: EMAIL_ACTIF, motDePasse: MOT_DE_PASSE });
    cookiesValides = loginReponse.headers["set-cookie"] as unknown as string[];
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: [userActifId, userDesactiveId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userActifId, userDesactiveId] } },
    });
    await prisma.$disconnect();
  });

  describe("POST /auth/login", () => {
    it("bon mot de passe -> 200, cookies accessToken et refreshToken poses", () => {
      expect(loginReponse.status).toBe(200);
      expect(loginReponse.body.success).toBe(true);
      expect(loginReponse.body.data.role).toBe("ORGANISATEUR");
      expect(cookieValue(cookiesValides, "accessToken")).toContain("accessToken=");
      expect(cookieValue(cookiesValides, "refreshToken")).toContain("refreshToken=");
    });

    it("mauvais mot de passe -> 401", async () => {
      const res = await request(app)
        .post("/auth/login")
        .send({ email: EMAIL_ACTIF, motDePasse: "MauvaisMotDePasse!" });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("compte desactive -> 403", async () => {
      const res = await request(app)
        .post("/auth/login")
        .send({ email: EMAIL_DESACTIVE, motDePasse: MOT_DE_PASSE });
      expect(res.status).toBe(403);
    });
  });

  describe("GET /auth/moi", () => {
    it("sans cookie -> 401", async () => {
      const res = await request(app).get("/auth/moi");
      expect(res.status).toBe(401);
    });

    it("avec cookie valide -> infos du compte, jamais le hash du mot de passe", async () => {
      const res = await request(app)
        .get("/auth/moi")
        .set("Cookie", cookieValue(cookiesValides, "accessToken"));

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(EMAIL_ACTIF);
      expect(res.body.data.role).toBe("ORGANISATEUR");
      expect(res.body.data.motDePasse).toBeUndefined();
    });
  });

  describe("POST /auth/refresh", () => {
    it("sans cookie -> 401", async () => {
      const res = await request(app).post("/auth/refresh");
      expect(res.status).toBe(401);
    });

    it("token revoque -> 401", async () => {
      const tokenBrut = crypto.randomBytes(40).toString("hex");
      await prisma.refreshToken.create({
        data: {
          token: hashToken(tokenBrut),
          userId: userActifId,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60),
          revoked: true,
        },
      });
      const res = await request(app)
        .post("/auth/refresh")
        .set("Cookie", `refreshToken=${tokenBrut}`);
      expect(res.status).toBe(401);
    });

    it("token expire -> 401", async () => {
      const tokenBrut = crypto.randomBytes(40).toString("hex");
      await prisma.refreshToken.create({
        data: {
          token: hashToken(tokenBrut),
          userId: userActifId,
          expiresAt: new Date(Date.now() - 1000), // deja passe
          revoked: false,
        },
      });
      const res = await request(app)
        .post("/auth/refresh")
        .set("Cookie", `refreshToken=${tokenBrut}`);
      expect(res.status).toBe(401);
    });

    it("token valide -> 200, nouveau accessToken pose", async () => {
      const res = await request(app)
        .post("/auth/refresh")
        .set("Cookie", cookieValue(cookiesValides, "refreshToken"));

      expect(res.status).toBe(200);
      const nouveauxCookies = res.headers["set-cookie"] as unknown as string[];
      expect(cookieValue(nouveauxCookies, "accessToken")).toContain("accessToken=");
    });
  });

  describe("POST /auth/logout", () => {
    it("revoque bien le refresh token en base", async () => {
      // Login dedie, isole des autres tests (une 4e tentative /auth/login,
      // toujours sous la limite de 5 du limiteurLogin).
      const loginDedie = await request(app)
        .post("/auth/login")
        .send({ email: EMAIL_ACTIF, motDePasse: MOT_DE_PASSE });
      const cookiesDedies = loginDedie.headers["set-cookie"] as unknown as string[];
      const refreshBrut = cookieValue(cookiesDedies, "refreshToken").split("=")[1];

      const res = await request(app)
        .post("/auth/logout")
        .set("Cookie", cookieValue(cookiesDedies, "refreshToken"));
      expect(res.status).toBe(200);

      const enBase = await prisma.refreshToken.findUnique({
        where: { token: hashToken(refreshBrut) },
      });
      expect(enBase?.revoked).toBe(true);
    });
  });
});
