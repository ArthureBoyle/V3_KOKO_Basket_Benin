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
const EMAIL_ADMIN_SANS_CODE = "test9103@koko.bj";
const EMAIL_ADMIN_BRUTE = "test9104@koko.bj";
const MOT_DE_PASSE = "TestSuite123!";
const CODE_ADMIN = "Code-Secret-Admin-2026";

describe("Comptes", () => {
  let adminId: number;
  let adminSansCodeId: number;
  let adminBruteId: number;
  let orgaId: number;
  let cookiesAdmin: string[];
  let cookiesAdminSansCode: string[];
  let cookiesAdminBrute: string[];
  let cookiesOrga: string[];
  const idsComptesCrees: number[] = [];

  beforeAll(async () => {
    const hash = await bcrypt.hash(MOT_DE_PASSE, 10);
    const hashCode = await bcrypt.hash(CODE_ADMIN, 10);

    const admin = await prisma.user.create({
      data: {
        email: EMAIL_ADMIN,
        motDePasse: hash,
        role: "ADMIN",
        actif: true,
        mustChangePassword: false,
        nom: "Suite",
        prenom: "Admin",
        codeSecretAdmin: hashCode,
      },
    });
    adminId = admin.id;

    // Admin qui n'a jamais lance le script : codeSecretAdmin reste null.
    const adminSansCode = await prisma.user.create({
      data: {
        email: EMAIL_ADMIN_SANS_CODE,
        motDePasse: hash,
        role: "ADMIN",
        mustChangePassword: false,
        nom: "Suite",
        prenom: "AdminSansCode",
      },
    });
    adminSansCodeId = adminSansCode.id;

    // Admin dedie au test de brute force : le limiteur est cle sur le
    // compte, on ne bloque donc pas l'admin principal pour la suite.
    const adminBrute = await prisma.user.create({
      data: {
        email: EMAIL_ADMIN_BRUTE,
        motDePasse: hash,
        role: "ADMIN",
        mustChangePassword: false,
        nom: "Suite",
        prenom: "AdminBrute",
        codeSecretAdmin: hashCode,
      },
    });
    adminBruteId = adminBrute.id;

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

    const loginSansCode = await request(app)
      .post("/auth/login")
      .send({ email: EMAIL_ADMIN_SANS_CODE, motDePasse: MOT_DE_PASSE });
    cookiesAdminSansCode = loginSansCode.headers["set-cookie"] as unknown as string[];

    const loginBrute = await request(app)
      .post("/auth/login")
      .send({ email: EMAIL_ADMIN_BRUTE, motDePasse: MOT_DE_PASSE });
    cookiesAdminBrute = loginBrute.headers["set-cookie"] as unknown as string[];

    const loginOrga = await request(app)
      .post("/auth/login")
      .send({ email: EMAIL_ORGA, motDePasse: MOT_DE_PASSE });
    cookiesOrga = loginOrga.headers["set-cookie"] as unknown as string[];
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: [adminId, adminSansCodeId, adminBruteId, orgaId, ...idsComptesCrees] } },
    });
    await prisma.joueur.deleteMany({ where: { userId: { in: idsComptesCrees } } });
    await prisma.user.deleteMany({
      where: { id: { in: [adminId, adminSansCodeId, adminBruteId, orgaId, ...idsComptesCrees] } },
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

  describe("PUT /comptes/:id/desactiver — code secret admin", () => {
    it("sans codeAdmin -> 403, compte toujours actif", async () => {
      const res = await request(app)
        .put(`/comptes/${orgaId}/desactiver`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(res.status).toBe(403);

      const enBase = await prisma.user.findUnique({ where: { id: orgaId } });
      expect(enBase?.actif).toBe(true);
    });

    it("mauvais codeAdmin -> 403, compte toujours actif", async () => {
      const res = await request(app)
        .put(`/comptes/${orgaId}/desactiver`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ codeAdmin: "PasLeBonCode999" });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Code admin invalide");

      const enBase = await prisma.user.findUnique({ where: { id: orgaId } });
      expect(enBase?.actif).toBe(true);
    });

    it("admin SANS code defini -> 403 meme avec un code quelconque", async () => {
      const res = await request(app)
        .put(`/comptes/${orgaId}/desactiver`)
        .set("Cookie", cookieValue(cookiesAdminSansCode, "accessToken"))
        .send({ codeAdmin: CODE_ADMIN });
      expect(res.status).toBe(403);

      const enBase = await prisma.user.findUnique({ where: { id: orgaId } });
      expect(enBase?.actif).toBe(true);
    });

    it("ORGANISATEUR avec un code -> 403 (le role est verifie avant le code)", async () => {
      const res = await request(app)
        .put(`/comptes/${orgaId}/desactiver`)
        .set("Cookie", cookieValue(cookiesOrga, "accessToken"))
        .send({ codeAdmin: CODE_ADMIN });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Acces refuse");
    });

    it("5 echecs -> le 6e essai est bloque (429) meme avec le bon code", async () => {
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .put(`/comptes/${orgaId}/desactiver`)
          .set("Cookie", cookieValue(cookiesAdminBrute, "accessToken"))
          .send({ codeAdmin: `Mauvais-code-${i}` });
        expect(res.status).toBe(403);
      }
      const bloque = await request(app)
        .put(`/comptes/${orgaId}/desactiver`)
        .set("Cookie", cookieValue(cookiesAdminBrute, "accessToken"))
        .send({ codeAdmin: CODE_ADMIN });
      expect(bloque.status).toBe(429);

      const enBase = await prisma.user.findUnique({ where: { id: orgaId } });
      expect(enBase?.actif).toBe(true);
    });

    it("le hash du code n'apparait jamais dans GET /comptes ni /auth/moi", async () => {
      const comptes = await request(app)
        .get("/comptes")
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      const moi = await request(app)
        .get("/auth/moi")
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(moi.status).toBe(200);
      expect(JSON.stringify(comptes.body)).not.toContain("codeSecretAdmin");
      expect(JSON.stringify(moi.body)).not.toContain("codeSecretAdmin");
    });
  });

  describe("PUT /comptes/:id/desactiver et /reactiver", () => {
    it("desactive (bon code) : actif passe a false, login refuse ensuite (403)", async () => {
      const res = await request(app)
        .put(`/comptes/${orgaId}/desactiver`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ codeAdmin: CODE_ADMIN });
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
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ codeAdmin: CODE_ADMIN });
      expect(res.status).toBe(403);
    });
  });
});
