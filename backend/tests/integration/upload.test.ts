// ================================================
// TESTS D'INTEGRATION — upload avatar joueur / logo equipe
// ================================================
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import app from "../../src/app";
import prisma from "../../src/utils/prisma";
import { cookieValue } from "../helpers";

const EMAIL_ADMIN = "test9801@koko.bj";
const EMAIL_ORGA1 = "test9802@koko.bj";
const EMAIL_ORGA2 = "test9803@koko.bj";
const EMAIL_J1 = "test9804@koko.bj";
const EMAIL_J2 = "test9805@koko.bj"; // dedie au test de rate-limit, isole de J1
const MOT_DE_PASSE = "TestSuite123!";

// Vrai PNG 1x1 valide (magic bytes reels) — pour verifier que file-type
// laisse passer un vrai fichier, pas juste un Content-Type declare.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);
const UPLOADS_DIR = path.join(__dirname, "../../uploads");

describe("Upload images (avatar joueur / logo equipe)", () => {
  let adminId: number;
  let orga1Id: number;
  let orga2Id: number;
  let joueur1Id: number;
  let joueur2Id: number;
  let cookiesAdmin: string[];
  let cookiesOrga1: string[];
  let cookiesOrga2: string[];
  let cookiesJ1: string[];
  let cookiesJ2: string[];

  let tournoi1Id: number;
  let equipeAId: number;

  const userIds: number[] = [];
  const joueurIds: number[] = [];
  const tournoiIds: number[] = [];
  const equipeIds: number[] = [];

  beforeAll(async () => {
    const hash = await bcrypt.hash(MOT_DE_PASSE, 10);

    const admin = await prisma.user.create({
      data: { email: EMAIL_ADMIN, motDePasse: hash, role: "ADMIN", nom: "S", prenom: "Admin" },
    });
    adminId = admin.id;
    userIds.push(adminId);

    const orga1 = await prisma.user.create({
      data: { email: EMAIL_ORGA1, motDePasse: hash, role: "ORGANISATEUR", nom: "S", prenom: "Orga1" },
    });
    orga1Id = orga1.id;
    userIds.push(orga1Id);

    const orga2 = await prisma.user.create({
      data: { email: EMAIL_ORGA2, motDePasse: hash, role: "ORGANISATEUR", nom: "S", prenom: "Orga2" },
    });
    orga2Id = orga2.id;
    userIds.push(orga2Id);

    const userJ1 = await prisma.user.create({
      data: { email: EMAIL_J1, motDePasse: hash, role: "JOUEUR", nom: "Joueur", prenom: "J1" },
    });
    userIds.push(userJ1.id);
    const joueur1 = await prisma.joueur.create({ data: { idKoko: "KOKO-2026-8111", nomLegal: "Joueur", prenom: "J1", userId: userJ1.id } });
    joueur1Id = joueur1.id;
    joueurIds.push(joueur1Id);

    const userJ2 = await prisma.user.create({
      data: { email: EMAIL_J2, motDePasse: hash, role: "JOUEUR", nom: "Joueur", prenom: "J2" },
    });
    userIds.push(userJ2.id);
    const joueur2 = await prisma.joueur.create({ data: { idKoko: "KOKO-2026-8222", nomLegal: "Joueur", prenom: "J2", userId: userJ2.id } });
    joueur2Id = joueur2.id;
    joueurIds.push(joueur2Id);

    const tournoi1 = await prisma.tournoi.create({
      data: {
        nom: "Tournoi Upload Test", lieu: "Cotonou",
        dateDebut: new Date("2027-08-01"), dateFin: new Date("2027-08-10"),
        organisateurId: orga1Id, licencesMax: 5, equipesMax: 5,
      },
    });
    tournoi1Id = tournoi1.id;
    tournoiIds.push(tournoi1Id);

    const equipeA = await prisma.equipe.create({ data: { nom: "Lions", couleur: "#FF0000", tournoiId: tournoi1Id } });
    equipeAId = equipeA.id;
    equipeIds.push(equipeAId);

    cookiesAdmin = (await request(app).post("/auth/login").send({ email: EMAIL_ADMIN, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
    cookiesOrga1 = (await request(app).post("/auth/login").send({ email: EMAIL_ORGA1, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
    cookiesOrga2 = (await request(app).post("/auth/login").send({ email: EMAIL_ORGA2, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
    cookiesJ1 = (await request(app).post("/auth/login").send({ email: EMAIL_J1, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
    cookiesJ2 = (await request(app).post("/auth/login").send({ email: EMAIL_J2, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
  });

  afterAll(async () => {
    // Nettoie aussi les fichiers ecrits sur disque pendant les tests.
    const joueurFinal = await prisma.joueur.findUnique({ where: { id: joueur1Id } });
    const joueur2Final = await prisma.joueur.findUnique({ where: { id: joueur2Id } });
    const equipeFinal = await prisma.equipe.findUnique({ where: { id: equipeAId } });
    for (const chemin of [joueurFinal?.avatar, joueur2Final?.avatar, equipeFinal?.logo]) {
      if (chemin) fs.rmSync(path.join(UPLOADS_DIR, chemin), { force: true });
    }

    await prisma.equipe.deleteMany({ where: { id: { in: equipeIds } } });
    await prisma.tournoi.deleteMany({ where: { id: { in: tournoiIds } } });
    await prisma.joueur.deleteMany({ where: { id: { in: joueurIds } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  describe("PUT /joueurs/moi/avatar", () => {
    it("sans cookie -> 401", async () => {
      const res = await request(app).put("/joueurs/moi/avatar").attach("avatar", PNG_1X1, { filename: "a.png", contentType: "image/png" });
      expect(res.status).toBe(401);
    });

    it("aucun fichier -> 400", async () => {
      const res = await request(app).put("/joueurs/moi/avatar").set("Cookie", cookieValue(cookiesJ1, "accessToken"));
      expect(res.status).toBe(400);
    });

    it("mauvais Content-Type declare (texte) -> 400", async () => {
      const res = await request(app)
        .put("/joueurs/moi/avatar")
        .set("Cookie", cookieValue(cookiesJ1, "accessToken"))
        .attach("avatar", Buffer.from("bonjour"), { filename: "a.txt", contentType: "text/plain" });
      expect(res.status).toBe(400);
    });

    it("Content-Type image mais contenu reel invalide -> 400 (file-type le detecte)", async () => {
      const res = await request(app)
        .put("/joueurs/moi/avatar")
        .set("Cookie", cookieValue(cookiesJ1, "accessToken"))
        .attach("avatar", Buffer.from("ceci n'est pas une image"), { filename: "fake.jpg", contentType: "image/jpeg" });
      expect(res.status).toBe(400);
    });

    it("fichier trop volumineux (> 3 Mo) -> 400", async () => {
      const gros = Buffer.alloc(4 * 1024 * 1024, 1);
      const res = await request(app)
        .put("/joueurs/moi/avatar")
        .set("Cookie", cookieValue(cookiesJ1, "accessToken"))
        .attach("avatar", gros, { filename: "gros.jpg", contentType: "image/jpeg" });
      expect(res.status).toBe(400);
    });

    it("vrai PNG valide -> 200, chemin enregistre, fichier ecrit sur disque", async () => {
      const res = await request(app)
        .put("/joueurs/moi/avatar")
        .set("Cookie", cookieValue(cookiesJ1, "accessToken"))
        .attach("avatar", PNG_1X1, { filename: "avatar.png", contentType: "image/png" });
      expect(res.status).toBe(200);
      expect(res.body.data.avatar).toMatch(/^joueurs\/.+\.jpg$/);

      const fichierExiste = fs.existsSync(path.join(UPLOADS_DIR, res.body.data.avatar));
      expect(fichierExiste).toBe(true);
    });

    it("un 2e upload supprime l'ancien fichier", async () => {
      const avant = await prisma.joueur.findUnique({ where: { id: joueur1Id } });
      const ancienChemin = avant!.avatar!;

      const res = await request(app)
        .put("/joueurs/moi/avatar")
        .set("Cookie", cookieValue(cookiesJ1, "accessToken"))
        .attach("avatar", PNG_1X1, { filename: "avatar2.png", contentType: "image/png" });
      expect(res.status).toBe(200);
      expect(res.body.data.avatar).not.toBe(ancienChemin);

      const ancienExisteEncore = fs.existsSync(path.join(UPLOADS_DIR, ancienChemin));
      expect(ancienExisteEncore).toBe(false);
    });
  });

  describe("PUT /equipes/:id/logo", () => {
    it("pas proprietaire -> 404", async () => {
      const res = await request(app)
        .put(`/equipes/${equipeAId}/logo`)
        .set("Cookie", cookieValue(cookiesOrga2, "accessToken"))
        .attach("logo", PNG_1X1, { filename: "logo.png", contentType: "image/png" });
      expect(res.status).toBe(404);
    });

    it("proprietaire -> 200", async () => {
      const res = await request(app)
        .put(`/equipes/${equipeAId}/logo`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .attach("logo", PNG_1X1, { filename: "logo.png", contentType: "image/png" });
      expect(res.status).toBe(200);
      expect(res.body.data.logo).toMatch(/^equipes\/.+\.jpg$/);
    });

    it("ADMIN -> 200", async () => {
      const res = await request(app)
        .put(`/equipes/${equipeAId}/logo`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .attach("logo", PNG_1X1, { filename: "logo.png", contentType: "image/png" });
      expect(res.status).toBe(200);
    });
  });

  describe("Rate limit sur l'upload (limiteurUpload, max 10 / 15 min par compte)", () => {
    // Compte dedie (joueur2) pour ne pas fausser le compteur des autres
    // tests d'upload sur joueur1 plus haut.
    it("10 uploads passent, le 11e est bloque (429)", async () => {
      for (let i = 0; i < 10; i++) {
        const res = await request(app)
          .put("/joueurs/moi/avatar")
          .set("Cookie", cookieValue(cookiesJ2, "accessToken"))
          .attach("avatar", PNG_1X1, { filename: `avatar${i}.png`, contentType: "image/png" });
        expect(res.status).toBe(200);
      }

      const onzieme = await request(app)
        .put("/joueurs/moi/avatar")
        .set("Cookie", cookieValue(cookiesJ2, "accessToken"))
        .attach("avatar", PNG_1X1, { filename: "avatar10.png", contentType: "image/png" });
      expect(onzieme.status).toBe(429);
    });
  });
});
