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
        .send({ nomLegal: "Adjovi", prenom: "Koffi", emailReel: "koffi@example.com", dateNaissance: "2000-05-17" });

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
      await prisma.joueur.create({ data: { dateNaissance: new Date("2000-01-01"), idKoko: "KOKO-2026-9106", nomLegal: "Legal", prenom: "Koffi", userId: user.id } });
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
  describe("Date de naissance et age des joueurs", () => {
    const corpsJoueur = { nomLegal: "Dossou", prenom: "Ama", emailReel: "ama@example.com" };

    it("creation sans dateNaissance -> 400", async () => {
      const res = await request(app)
        .post("/comptes/joueur")
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send(corpsJoueur);
      expect(res.status).toBe(400);
    });

    it("creation avec une date dans le futur -> 400", async () => {
      const res = await request(app)
        .post("/comptes/joueur")
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ ...corpsJoueur, dateNaissance: "2999-01-01" });
      expect(res.status).toBe(400);
    });

    it("creation avec une date avant 1900 (faute de frappe) -> 400", async () => {
      const res = await request(app)
        .post("/comptes/joueur")
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ ...corpsJoueur, dateNaissance: "0199-05-17" });
      expect(res.status).toBe(400);
    });

    it("creation valide -> date de naissance enregistree", async () => {
      const res = await request(app)
        .post("/comptes/joueur")
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ ...corpsJoueur, dateNaissance: "2003-11-02" });
      expect(res.status).toBe(201);
      const joueur = await prisma.joueur.findUnique({ where: { idKoko: res.body.data.idKoko } });
      idsComptesCrees.push(joueur!.userId);
      expect(joueur!.dateNaissance!.toISOString().slice(0, 10)).toBe("2003-11-02");
    });

    it("GET /comptes -> age exact la veille et le jour de l'anniversaire, avatar present", async () => {
      const auj = new Date();
      const y = auj.getUTCFullYear();
      const m = auj.getUTCMonth();
      const d = auj.getUTCDate();
      const anniversaireAujourdhui = new Date(Date.UTC(y - 20, m, d));
      const anniversaireDemain = new Date(Date.UTC(y - 20, m, d + 1));

      const creer = async (email: string, idKoko: string, dateNaissance: Date) => {
        const user = await prisma.user.create({
          data: { email, motDePasse: "x", role: "JOUEUR", nom: "Age", prenom: idKoko },
        });
        idsComptesCrees.push(user.id);
        await prisma.joueur.create({ data: { idKoko, nomLegal: "Age", prenom: idKoko, dateNaissance, userId: user.id } });
        return user.id;
      };
      const idVingt = await creer("test9107@koko.bj", "KOKO-2026-9107", anniversaireAujourdhui);
      const idDixNeuf = await creer("test9108@koko.bj", "KOKO-2026-9108", anniversaireDemain);

      const res = await request(app).get("/comptes").set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(res.status).toBe(200);
      const trouver = (id: number) => res.body.data.find((c: any) => c.id === id);

      expect(trouver(idVingt).joueur.age).toBe(20);
      expect(trouver(idDixNeuf).joueur.age).toBe(19);
      expect(trouver(idVingt).joueur).toHaveProperty("avatar");
      expect(trouver(idVingt).joueur).toHaveProperty("surnom");
      expect(trouver(idVingt).joueur).toHaveProperty("dateNaissance");
    });

    it("PUT /comptes/:id : dateNaissance future -> 400, null -> 400 (corrigeable, pas effacable)", async () => {
      const cible = await prisma.user.findFirst({ where: { email: "test9107@koko.bj" } });
      const futur = await request(app)
        .put(`/comptes/${cible!.id}`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ dateNaissance: "2999-01-01" });
      expect(futur.status).toBe(400);

      const effacer = await request(app)
        .put(`/comptes/${cible!.id}`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ dateNaissance: null });
      expect(effacer.status).toBe(400);

      const corriger = await request(app)
        .put(`/comptes/${cible!.id}`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ dateNaissance: "1999-01-15" });
      expect(corriger.status).toBe(200);
    });
  });

  describe("GET /comptes — statut des tournois recalcule", () => {
    it("un tournoi aux dates passees, stocke A_VENIR en base, ressort TERMINE", async () => {
      const tournoi = await prisma.tournoi.create({
        data: {
          nom: "Tournoi Passe Comptes", lieu: "Cotonou",
          dateDebut: new Date("2020-01-01"), dateFin: new Date("2020-01-05"),
          organisateurId: orgaId, licencesMax: 5, equipesMax: 5,
        },
      });
      try {
        expect(tournoi.statut).toBe("A_VENIR");
        const res = await request(app).get("/comptes").set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
        const orga = res.body.data.find((c: any) => c.id === orgaId);
        expect(orga.tournois.find((t: any) => t.id === tournoi.id).statut).toBe("TERMINE");
      } finally {
        await prisma.tournoi.delete({ where: { id: tournoi.id } });
      }
    });
  });
  describe("GET /comptes/:id — fiche detaillee (ADMIN)", () => {
    let joueurUserId: number;
    let joueurId: number;
    const tournoiIds: number[] = [];
    let tournoiEnCoursId: number;
    let tournoiAnnuleId: number;

    beforeAll(async () => {
      const user = await prisma.user.create({
        data: { email: "test9110@koko.bj", motDePasse: "x", role: "JOUEUR", nom: "Fiche", prenom: "Joueur" },
      });
      joueurUserId = user.id;
      idsComptesCrees.push(user.id);
      const joueur = await prisma.joueur.create({
        data: { idKoko: "KOKO-2026-9110", nomLegal: "Fiche", prenom: "Joueur", dateNaissance: new Date("2004-03-10"), userId: user.id },
      });
      joueurId = joueur.id;

      const creerTournoi = async (nom: string, debut: string, fin: string, statut?: "ANNULE") => {
        const t = await prisma.tournoi.create({
          data: {
            nom, lieu: "Cotonou", dateDebut: new Date(debut), dateFin: new Date(fin),
            organisateurId: orgaId, licencesMax: 5, equipesMax: 5, ...(statut ? { statut } : {}),
          },
        });
        tournoiIds.push(t.id);
        const [e1, e2] = await Promise.all(
          ["A", "B"].map((n) => prisma.equipe.create({ data: { nom: `${nom}-${n}`, couleur: "#123456", tournoiId: t.id } }))
        );
        return { t, e1, e2 };
      };
      const passe = new Date("2020-02-02T18:00:00Z");

      // Tournoi 1 : certifie + equipe. Un match TERMINE (compte) et un match EN_RETARD (ne compte pas).
      const t1 = await creerTournoi("Fiche T1", "2099-01-01", "2099-12-31");
      tournoiEnCoursId = t1.t.id;
      await prisma.tournoiJoueur.create({ data: { tournoiId: t1.t.id, joueurId } });
      await prisma.equipeJoueur.create({ data: { equipeId: t1.e1.id, tournoiId: t1.t.id, joueurId, numeroDeMaillot: 23 } });
      const m1 = await prisma.match.create({ data: { tournoiId: t1.t.id, equipe1Id: t1.e1.id, equipe2Id: t1.e2.id, date: passe, lieu: "Salle", type: "Poule", score1: 60, score2: 50 } });
      const m2 = await prisma.match.create({ data: { tournoiId: t1.t.id, equipe1Id: t1.e1.id, equipe2Id: t1.e2.id, date: passe, lieu: "Salle", type: "Poule" } });
      await prisma.stat.create({ data: { matchId: m1.id, joueurId, equipeId: t1.e1.id, points: 20, fautes: 2, contres: 1, tempsJeu: 30 } });
      await prisma.stat.create({ data: { matchId: m2.id, joueurId, equipeId: t1.e1.id, points: 99, fautes: 5, contres: 9, tempsJeu: 40 } });

      // Tournoi 2 : ANNULE, joueur certifie sans equipe. Son match termine ne compte pas.
      const t2 = await creerTournoi("Fiche T2", "2021-01-01", "2021-01-10", "ANNULE");
      tournoiAnnuleId = t2.t.id;
      await prisma.tournoiJoueur.create({ data: { tournoiId: t2.t.id, joueurId } });
      const m3 = await prisma.match.create({ data: { tournoiId: t2.t.id, equipe1Id: t2.e1.id, equipe2Id: t2.e2.id, date: passe, lieu: "Salle", type: "Poule", score1: 70, score2: 40 } });
      await prisma.stat.create({ data: { matchId: m3.id, joueurId, equipeId: t2.e1.id, points: 50, fautes: 4, contres: 4, tempsJeu: 35 } });

      // Tournoi 3 : le joueur en a ete RETIRE (plus dans le pool). Son match termine compte quand meme.
      const t3 = await creerTournoi("Fiche T3", "2019-01-01", "2019-01-10");
      const m4 = await prisma.match.create({ data: { tournoiId: t3.t.id, equipe1Id: t3.e1.id, equipe2Id: t3.e2.id, date: passe, lieu: "Salle", type: "Poule", score1: 55, score2: 45 } });
      await prisma.stat.create({ data: { matchId: m4.id, joueurId, equipeId: t3.e1.id, points: 10, fautes: 1, contres: 0, tempsJeu: 20 } });
    });

    afterAll(async () => {
      await prisma.stat.deleteMany({ where: { joueurId } });
      await prisma.match.deleteMany({ where: { tournoiId: { in: tournoiIds } } });
      await prisma.equipeJoueur.deleteMany({ where: { tournoiId: { in: tournoiIds } } });
      await prisma.tournoiJoueur.deleteMany({ where: { tournoiId: { in: tournoiIds } } });
      await prisma.equipe.deleteMany({ where: { tournoiId: { in: tournoiIds } } });
      await prisma.tournoi.deleteMany({ where: { id: { in: tournoiIds } } });
    });

    it("joueur -> identite, age, photo, tournois certifies avec equipe, stats toutes competitions", async () => {
      const res = await request(app).get(`/comptes/${joueurUserId}`).set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(res.status).toBe(200);
      const fiche = res.body.data;

      expect(fiche.joueur.idKoko).toBe("KOKO-2026-9110");
      expect(typeof fiche.joueur.age).toBe("number");
      expect(fiche.joueur).toHaveProperty("avatar");
      expect(fiche.motDePasse).toBeUndefined();
      expect(fiche.codeSecretAdmin).toBeUndefined();

      // Tournois ou il est certifie : T1 (avec equipe) et T2 annule (sans equipe). Pas T3 (retire).
      expect(fiche.tournois).toHaveLength(2);
      const t1 = fiche.tournois.find((l: any) => l.tournoi.id === tournoiEnCoursId);
      expect(t1.tournoi.statut).toBe("A_VENIR");
      expect(t1.equipe).toMatchObject({ nom: "Fiche T1-A", numeroDeMaillot: 23 });
      const t2 = fiche.tournois.find((l: any) => l.tournoi.id === tournoiAnnuleId);
      expect(t2.tournoi.statut).toBe("ANNULE");
      expect(t2.equipe).toBeNull();

      // Comptent : m1 (T1, termine) + m4 (T3, retire mais termine).
      // Ne comptent pas : m2 (score attendu) et m3 (tournoi annule).
      expect(fiche.statsGlobales).toEqual({
        matchsJoues: 2,
        totalPts: 30,
        totalFautes: 3,
        totalContres: 1,
        totalTempsJeu: 50,
        moyennePts: 15,
        moyenneFautes: 1.5,
        moyenneContres: 0.5,
        moyenneTempsJeu: 25,
      });
    });

    it("organisateur -> ses tournois avec statut recalcule, pas de bloc joueur ni de stats", async () => {
      const res = await request(app).get(`/comptes/${orgaId}`).set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(res.status).toBe(200);
      expect(res.body.data.joueur).toBeUndefined();
      expect(res.body.data.statsGlobales).toBeUndefined();
      const annule = res.body.data.tournois.find((t: any) => t.id === tournoiAnnuleId);
      expect(annule.statut).toBe("ANNULE");
      const passe = res.body.data.tournois.find((t: any) => t.nom === "Fiche T3");
      expect(passe.statut).toBe("TERMINE");
    });

    it("compte ADMIN ou inexistant -> 404 ; organisateur connecte -> 403", async () => {
      const admin = await request(app).get(`/comptes/${adminSansCodeId}`).set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(admin.status).toBe(404);
      const inexistant = await request(app).get("/comptes/999999").set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(inexistant.status).toBe(404);
      const parOrga = await request(app).get(`/comptes/${joueurUserId}`).set("Cookie", cookieValue(cookiesOrga, "accessToken"));
      expect(parOrga.status).toBe(403);
    });
  });
});
