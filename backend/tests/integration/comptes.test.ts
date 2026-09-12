// ================================================
// TESTS D'INTEGRATION — module comptes (ADMIN seulement)
// ================================================
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../src/app";
import prisma from "../../src/utils/prisma";
import { cookieValue } from "../helpers";

const EMAIL_ADMIN = "test9101@koko.bj";
const EMAIL_ORGA = "test9102@koko.bj";
const MOT_DE_PASSE = "TestSuite123!";

describe("Comptes", () => {
  let adminId: number;
  let orgaId: number;
  let cookiesAdmin: string[];
  let cookiesOrga: string[];
  const idsComptesCrees: number[] = [];

  beforeAll(async () => {
    const hash = await bcrypt.hash(MOT_DE_PASSE, 10);

    const admin = await prisma.user.create({
      data: {
        email: EMAIL_ADMIN,
        motDePasse: hash,
        role: "ADMIN",
        actif: true,
        mustChangePassword: false,
        nom: "Suite",
        prenom: "Admin",
      },
    });
    adminId = admin.id;

    const orga = await prisma.user.create({
      data: {
        email: EMAIL_ORGA,
        motDePasse: hash,
        role: "ORGANISATEUR",
        actif: true,
        mustChangePassword: false,
        nom: "Suite",
        prenom: "Orga",
      },
    });
    orgaId = orga.id;

    const loginAdmin = await request(app)
      .post("/auth/login")
      .send({ email: EMAIL_ADMIN, motDePasse: MOT_DE_PASSE });
    cookiesAdmin = loginAdmin.headers["set-cookie"] as unknown as string[];

    const loginOrga = await request(app)
      .post("/auth/login")
      .send({ email: EMAIL_ORGA, motDePasse: MOT_DE_PASSE });
    cookiesOrga = loginOrga.headers["set-cookie"] as unknown as string[];
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: [adminId, orgaId, ...idsComptesCrees] } },
    });
    await prisma.joueur.deleteMany({ where: { userId: { in: idsComptesCrees } } });
    await prisma.user.deleteMany({
      where: { id: { in: [adminId, orgaId, ...idsComptesCrees] } },
    });
    await prisma.$disconnect();
  });

  describe("GET /comptes", () => {
    it("sans cookie -> 401", async () => {
      const res = await request(app).get("/comptes");
      expect(res.status).toBe(401);
    });

    it("connecte mais pas ADMIN -> 403", async () => {
      const res = await request(app)
        .get("/comptes")
        .set("Cookie", cookieValue(cookiesOrga, "accessToken"));
      expect(res.status).toBe(403);
    });

    it("ADMIN -> 200, liste sans le compte admin lui-meme", async () => {
      const res = await request(app)
        .get("/comptes")
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.every((c: any) => c.role !== "ADMIN")).toBe(true);
    });
  });

  describe("POST /comptes/organisateur", () => {
    it("ADMIN -> 201, email koko.bj genere, mot de passe par defaut renvoye", async () => {
      const res = await request(app)
        .post("/comptes/organisateur")
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ nom: "Dupont", prenom: "Jean", emailReel: "jean.dupont@example.com" });

      expect(res.status).toBe(201);
      expect(res.body.data.emailKoko).toMatch(/@koko\.bj$/);
      expect(res.body.data.motDePasse).toBe("Orga2025!");
      idsComptesCrees.push(res.body.data.id);

      const enBase = await prisma.user.findUnique({ where: { id: res.body.data.id } });
      expect(enBase?.mustChangePassword).toBe(true);
    });

    it("pas ADMIN -> 403", async () => {
      const res = await request(app)
        .post("/comptes/organisateur")
        .set("Cookie", cookieValue(cookiesOrga, "accessToken"))
        .send({ nom: "X", prenom: "Y", emailReel: "x@example.com" });
      expect(res.status).toBe(403);
    });
  });

  describe("POST /comptes/joueur", () => {
    it("ADMIN -> 201, idKoko genere, User + Joueur crees ensemble", async () => {
      const res = await request(app)
        .post("/comptes/joueur")
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ nomLegal: "Adjovi", prenom: "Koffi", emailReel: "koffi@example.com" });

      expect(res.status).toBe(201);
      expect(res.body.data.idKoko).toMatch(/^KOKO-\d{4}-\d{4}$/);

      const joueur = await prisma.joueur.findUnique({
        where: { idKoko: res.body.data.idKoko },
        include: { user: true },
      });
      expect(joueur).not.toBeNull();
      idsComptesCrees.push(joueur!.userId);
    });
  });

  describe("PUT /comptes/:id/desactiver et /reactiver", () => {
    it("desactive : actif passe a false, login refuse ensuite (403)", async () => {
      const res = await request(app)
        .put(`/comptes/${orgaId}/desactiver`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(res.status).toBe(200);

      const loginApresDesactivation = await request(app)
        .post("/auth/login")
        .send({ email: EMAIL_ORGA, motDePasse: MOT_DE_PASSE });
      expect(loginApresDesactivation.status).toBe(403);
    });

    it("reactive : actif repasse a true, login refonctionne", async () => {
      const res = await request(app)
        .put(`/comptes/${orgaId}/reactiver`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(res.status).toBe(200);

      const loginApresReactivation = await request(app)
        .post("/auth/login")
        .send({ email: EMAIL_ORGA, motDePasse: MOT_DE_PASSE });
      expect(loginApresReactivation.status).toBe(200);
    });

    it("impossible de desactiver le compte ADMIN lui-meme", async () => {
      const res = await request(app)
        .put(`/comptes/${adminId}/desactiver`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(res.status).toBe(403);
    });
  });
});
