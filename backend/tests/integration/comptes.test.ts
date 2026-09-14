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
  describe("PUT /comptes/:id/reactiver", () => {
    it("compte inexistant -> 404 (plus de 500)", async () => {
      const res = await request(app)
        .put("/comptes/999999/reactiver")
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /comptes/:id/reinitialiser-mot-de-passe (code secret admin)", () => {
    const EMAIL_CIBLE = "test9105@koko.bj";
    const ANCIEN = "AncienMotDePasse1!";
    let cibleId: number;
    let cookiesCible: string[];

    beforeAll(async () => {
      const cible = await prisma.user.create({
        data: {
          email: EMAIL_CIBLE, motDePasse: await bcrypt.hash(ANCIEN, 10), role: "ORGANISATEUR",
          nom: "Cible", prenom: "Reset",
        },
      });
      cibleId = cible.id;
      idsComptesCrees.push(cibleId);
      const login = await request(app).post("/auth/login").send({ email: EMAIL_CIBLE, motDePasse: ANCIEN });
      cookiesCible = login.headers["set-cookie"] as unknown as string[];
    });

    it("admin sans code defini -> 403, mot de passe inchange", async () => {
      const res = await request(app)
        .put(`/comptes/${cibleId}/reinitialiser-mot-de-passe`)
        .set("Cookie", cookieValue(cookiesAdminSansCode, "accessToken"))
        .send({ codeAdmin: CODE_ADMIN });
      expect(res.status).toBe(403);
      const enBase = await prisma.user.findUnique({ where: { id: cibleId } });
      expect(await bcrypt.compare(ANCIEN, enBase!.motDePasse)).toBe(true);
    });

    it("compte ADMIN vise -> 403", async () => {
      const res = await request(app)
        .put(`/comptes/${adminSansCodeId}/reinitialiser-mot-de-passe`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ codeAdmin: CODE_ADMIN });
      expect(res.status).toBe(403);
    });

    it("les erreurs apres le code (404) ne consomment pas le limiteur du code", async () => {
      for (let i = 0; i < 7; i++) {
        const res = await request(app)
          .put("/comptes/999999/reinitialiser-mot-de-passe")
          .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
          .send({ codeAdmin: CODE_ADMIN });
        expect(res.status).toBe(404);
      }
    });

    it("bon code -> 200 : nouveau mot de passe aleatoire, ancien refuse, sessions coupees, login OK avec le nouveau", async () => {
      expect(await prisma.refreshToken.count({ where: { userId: cibleId } })).toBeGreaterThan(0);

      const res = await request(app)
        .put(`/comptes/${cibleId}/reinitialiser-mot-de-passe`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ codeAdmin: CODE_ADMIN });
      expect(res.status).toBe(200);
      const temporaire: string = res.body.data.nouveauMotDePasse;
      expect(temporaire).toMatch(/^[A-HJ-NP-Za-km-z2-9]{12}$/);

      const enBase = await prisma.user.findUnique({ where: { id: cibleId } });
      expect(await bcrypt.compare(ANCIEN, enBase!.motDePasse)).toBe(false);
      expect(enBase!.motDePasse).not.toContain(temporaire);

      // Toutes les sessions coupees : plus aucun refresh token, l'ancien cookie ne rafraichit plus.
      expect(await prisma.refreshToken.count({ where: { userId: cibleId } })).toBe(0);
      const refresh = await request(app)
        .post("/auth/refresh")
        .set("Cookie", cookieValue(cookiesCible, "refreshToken"));
      expect(refresh.status).toBe(401);

      const login = await request(app).post("/auth/login").send({ email: EMAIL_CIBLE, motDePasse: temporaire });
      expect(login.status).toBe(200);
    });

    it("deux reinitialisations -> deux mots de passe differents", async () => {
      const envoyer = () =>
        request(app)
          .put(`/comptes/${cibleId}/reinitialiser-mot-de-passe`)
          .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
          .send({ codeAdmin: CODE_ADMIN });
      const premier = await envoyer();
      const second = await envoyer();
      expect(premier.body.data.nouveauMotDePasse).not.toBe(second.body.data.nouveauMotDePasse);
    });
  });

  describe("PUT /comptes/:id (identite, sans code)", () => {
    let joueurUserId: number;

    beforeAll(async () => {
      const user = await prisma.user.create({
        data: {
          email: "test9106@koko.bj", motDePasse: "x", role: "JOUEUR",
          nom: "Legal", prenom: "Koffi", emailReel: "koffi.reel@example.com",
        },
      });
      joueurUserId = user.id;
      idsComptesCrees.push(joueurUserId);
      await prisma.joueur.create({ data: { idKoko: "KOKO-2026-9106", nomLegal: "Legal", prenom: "Koffi", userId: user.id } });
    });

    it("organisateur : nom et prenom -> 200", async () => {
      const res = await request(app)
        .put(`/comptes/${orgaId}`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ nom: "Houngbo", prenom: "Rita" });
      expect(res.status).toBe(200);
      const enBase = await prisma.user.findUnique({ where: { id: orgaId } });
      expect(enBase).toMatchObject({ nom: "Houngbo", prenom: "Rita" });
    });

    it("organisateur : surnom -> 400 (reserve aux joueurs)", async () => {
      const res = await request(app)
        .put(`/comptes/${orgaId}`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ surnom: "Boss" });
      expect(res.status).toBe(400);
    });

    it("emailReel glisse dans le body -> 400, jamais modifie sans le code", async () => {
      const res = await request(app)
        .put(`/comptes/${joueurUserId}`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ nom: "Legal", emailReel: "pirate@example.com" });
      expect(res.status).toBe(400);
      const enBase = await prisma.user.findUnique({ where: { id: joueurUserId } });
      expect(enBase!.emailReel).toBe("koffi.reel@example.com");
    });

    it("body vide -> 400", async () => {
      const res = await request(app)
        .put(`/comptes/${joueurUserId}`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({});
      expect(res.status).toBe(400);
    });

    it("joueur : nom, surnom, dateNaissance -> 200, User et Joueur synchronises", async () => {
      const res = await request(app)
        .put(`/comptes/${joueurUserId}`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ nom: "Legal-Corrige", surnom: "Flash", dateNaissance: "2001-04-12" });
      expect(res.status).toBe(200);

      const user = await prisma.user.findUnique({ where: { id: joueurUserId }, include: { joueur: true } });
      expect(user!.nom).toBe("Legal-Corrige");
      expect(user!.prenom).toBe("Koffi");
      expect(user!.joueur!.nomLegal).toBe("Legal-Corrige");
      expect(user!.joueur!.surnom).toBe("Flash");
      expect(user!.joueur!.dateNaissance!.toISOString().slice(0, 10)).toBe("2001-04-12");
    });

    it("joueur : surnom null -> efface", async () => {
      const res = await request(app)
        .put(`/comptes/${joueurUserId}`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ surnom: null });
      expect(res.status).toBe(200);
      const joueur = await prisma.joueur.findUnique({ where: { userId: joueurUserId } });
      expect(joueur!.surnom).toBeNull();
    });

    it("compte ADMIN vise -> 403", async () => {
      const res = await request(app)
        .put(`/comptes/${adminSansCodeId}`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ nom: "Pirate" });
      expect(res.status).toBe(403);
    });

    it("un organisateur -> 403 (route ADMIN)", async () => {
      const res = await request(app)
        .put(`/comptes/${joueurUserId}`)
        .set("Cookie", cookieValue(cookiesOrga, "accessToken"))
        .send({ nom: "Pirate" });
      expect(res.status).toBe(403);
    });

    describe("PUT /comptes/:id/email-reel (code secret admin)", () => {
      it("admin sans code defini -> 403, email inchange", async () => {
        const res = await request(app)
          .put(`/comptes/${joueurUserId}/email-reel`)
          .set("Cookie", cookieValue(cookiesAdminSansCode, "accessToken"))
          .send({ emailReel: "nouveau@example.com", codeAdmin: CODE_ADMIN });
        expect(res.status).toBe(403);
        const enBase = await prisma.user.findUnique({ where: { id: joueurUserId } });
        expect(enBase!.emailReel).toBe("koffi.reel@example.com");
      });

      it("bon code, email invalide -> 400", async () => {
        const res = await request(app)
          .put(`/comptes/${joueurUserId}/email-reel`)
          .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
          .send({ emailReel: "pas-un-email", codeAdmin: CODE_ADMIN });
        expect(res.status).toBe(400);
      });

      it("bon code -> 200, email reel modifie", async () => {
        const res = await request(app)
          .put(`/comptes/${joueurUserId}/email-reel`)
          .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
          .send({ emailReel: "nouveau@example.com", codeAdmin: CODE_ADMIN });
        expect(res.status).toBe(200);
        const enBase = await prisma.user.findUnique({ where: { id: joueurUserId } });
        expect(enBase!.emailReel).toBe("nouveau@example.com");
      });

      it("compte ADMIN vise -> 403", async () => {
        const res = await request(app)
          .put(`/comptes/${adminSansCodeId}/email-reel`)
          .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
          .send({ emailReel: "pirate@example.com", codeAdmin: CODE_ADMIN });
        expect(res.status).toBe(403);
      });
    });
  });
});
