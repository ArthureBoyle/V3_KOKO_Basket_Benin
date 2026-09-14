// ================================================
// TESTS D'INTEGRATION — routes cote joueur (/joueurs/moi/...)
// ================================================
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../src/app";
import prisma from "../../src/utils/prisma";
import { cookieValue } from "../helpers";

const EMAIL_ORGA1 = "test9701@koko.bj";
const EMAIL_J1 = "test9702@koko.bj"; // dans le pool + place dans equipeA
const EMAIL_J2 = "test9703@koko.bj"; // dans le pool, PAS dans une equipe
const EMAIL_J3 = "test9704@koko.bj"; // PAS dans le pool du tout
const MOT_DE_PASSE = "TestSuite123!";

describe("Routes joueur (/joueurs/moi)", () => {
  let orga1Id: number;
  let cookiesOrga1: string[];
  let cookiesJ1: string[];
  let cookiesJ2: string[];
  let cookiesJ3: string[];

  let tournoi1Id: number;
  let equipeAId: number;
  let equipeBId: number;
  let joueur1Id: number;
  let joueur2Id: number;
  let joueur3Id: number;
  let matchId: number;

  const userIds: number[] = [];
  const joueurIds: number[] = [];
  const tournoiIds: number[] = [];
  const equipeIds: number[] = [];
  const matchIds: number[] = [];

  beforeAll(async () => {
    const hash = await bcrypt.hash(MOT_DE_PASSE, 10);

    const orga1 = await prisma.user.create({
      data: { email: EMAIL_ORGA1, motDePasse: hash, role: "ORGANISATEUR", nom: "S", prenom: "Orga1", mustChangePassword: false },
    });
    orga1Id = orga1.id;
    userIds.push(orga1Id);

    const creerJoueur = async (email: string, idKoko: string, prenom: string) => {
      const user = await prisma.user.create({
        data: { email, motDePasse: hash, role: "JOUEUR", nom: "Joueur", prenom, mustChangePassword: false },
      });
      userIds.push(user.id);
      const joueur = await prisma.joueur.create({ data: { idKoko, nomLegal: "Joueur", prenom, userId: user.id } });
      joueurIds.push(joueur.id);
      return joueur.id;
    };

    joueur1Id = await creerJoueur(EMAIL_J1, "KOKO-2026-7111", "J1");
    joueur2Id = await creerJoueur(EMAIL_J2, "KOKO-2026-7222", "J2");
    joueur3Id = await creerJoueur(EMAIL_J3, "KOKO-2026-7333", "J3");

    const tournoi1 = await prisma.tournoi.create({
      data: {
        nom: "Tournoi Joueur Test", lieu: "Cotonou",
        dateDebut: new Date("2027-08-01"), dateFin: new Date("2027-08-10"),
        organisateurId: orga1Id, licencesMax: 5, equipesMax: 5,
      },
    });
    tournoi1Id = tournoi1.id;
    tournoiIds.push(tournoi1Id);

    const equipeA = await prisma.equipe.create({ data: { nom: "Lions", couleur: "#FF0000", tournoiId: tournoi1Id } });
    equipeAId = equipeA.id;
    equipeIds.push(equipeAId);
    const equipeB = await prisma.equipe.create({ data: { nom: "Tigres", couleur: "#0000FF", tournoiId: tournoi1Id } });
    equipeBId = equipeB.id;
    equipeIds.push(equipeBId);

    // joueur1 et joueur2 sont dans le pool ; joueur3 n'y est jamais.
    await prisma.tournoiJoueur.createMany({
      data: [
        { tournoiId: tournoi1Id, joueurId: joueur1Id },
        { tournoiId: tournoi1Id, joueurId: joueur2Id },
      ],
    });

    // Seul joueur1 est place dans une equipe.
    await prisma.equipeJoueur.create({
      data: { equipeId: equipeAId, tournoiId: tournoi1Id, joueurId: joueur1Id, numeroDeMaillot: 7 },
    });

    const match = await prisma.match.create({
      data: { tournoiId: tournoi1Id, equipe1Id: equipeAId, equipe2Id: equipeBId, date: new Date("2027-08-05T18:00:00Z"), lieu: "Gymnase", type: "Poule" },
    });
    matchId = match.id;
    matchIds.push(matchId);

    cookiesOrga1 = (await request(app).post("/auth/login").send({ email: EMAIL_ORGA1, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
    cookiesJ1 = (await request(app).post("/auth/login").send({ email: EMAIL_J1, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
    cookiesJ2 = (await request(app).post("/auth/login").send({ email: EMAIL_J2, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
    cookiesJ3 = (await request(app).post("/auth/login").send({ email: EMAIL_J3, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
  });

  afterAll(async () => {
    await prisma.match.deleteMany({ where: { id: { in: matchIds } } });
    await prisma.equipeJoueur.deleteMany({ where: { tournoiId: { in: tournoiIds } } });
    await prisma.equipe.deleteMany({ where: { id: { in: equipeIds } } });
    await prisma.tournoiJoueur.deleteMany({ where: { tournoiId: { in: tournoiIds } } });
    await prisma.tournoi.deleteMany({ where: { id: { in: tournoiIds } } });
    await prisma.joueur.deleteMany({ where: { id: { in: joueurIds } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  describe("GET /joueurs/moi", () => {
    it("sans cookie -> 401", async () => {
      const res = await request(app).get("/joueurs/moi");
      expect(res.status).toBe(401);
    });

    it("pas JOUEUR (organisateur) -> 403", async () => {
      const res = await request(app).get("/joueurs/moi").set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(403);
    });

    it("joueur1 -> 200, son propre profil", async () => {
      const res = await request(app).get("/joueurs/moi").set("Cookie", cookieValue(cookiesJ1, "accessToken"));
      expect(res.status).toBe(200);
      expect(res.body.data.idKoko).toBe("KOKO-2026-7111");
    });
  });

  describe("GET /joueurs/moi/tournois (tournois ou il est certifie)", () => {
    it("joueur1 (pool + equipeA) -> 200, son tournoi avec son equipe et son maillot", async () => {
      const res = await request(app).get("/joueurs/moi/tournois").set("Cookie", cookieValue(cookiesJ1, "accessToken"));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].tournoi.id).toBe(tournoi1Id);
      expect(res.body.data[0].equipe.id).toBe(equipeAId);
      expect(res.body.data[0].equipe.numeroDeMaillot).toBe(7);
    });

    it("joueur2 (pool, pas encore d'equipe) -> 200, certifie quand meme, equipe null", async () => {
      const res = await request(app).get("/joueurs/moi/tournois").set("Cookie", cookieValue(cookiesJ2, "accessToken"));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].tournoi.id).toBe(tournoi1Id);
      expect(res.body.data[0].equipe).toBeNull();
    });

    it("joueur3 (hors pool) -> 200, tableau vide", async () => {
      const res = await request(app).get("/joueurs/moi/tournois").set("Cookie", cookieValue(cookiesJ3, "accessToken"));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it("un tournoi ANNULE n'apparait jamais, meme si le joueur est dans son pool", async () => {
      const annule = await prisma.tournoi.create({
        data: {
          nom: "Tournoi Annule Joueur", lieu: "Cotonou",
          dateDebut: new Date("2027-09-01"), dateFin: new Date("2027-09-10"),
          organisateurId: orga1Id, licencesMax: 5, equipesMax: 5, statut: "ANNULE",
        },
      });
      tournoiIds.push(annule.id);
      await prisma.tournoiJoueur.create({ data: { tournoiId: annule.id, joueurId: joueur1Id } });

      const res = await request(app).get("/joueurs/moi/tournois").set("Cookie", cookieValue(cookiesJ1, "accessToken"));
      expect(res.status).toBe(200);
      expect(res.body.data.some((ligne: any) => ligne.tournoi.id === annule.id)).toBe(false);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe("GET /joueurs/moi/matchs", () => {
    it("sans tournoiId -> 400", async () => {
      const res = await request(app).get("/joueurs/moi/matchs").set("Cookie", cookieValue(cookiesJ1, "accessToken"));
      expect(res.status).toBe(400);
    });

    it("joueur3 (pas dans le pool) -> 404", async () => {
      const res = await request(app)
        .get(`/joueurs/moi/matchs?tournoiId=${tournoi1Id}`)
        .set("Cookie", cookieValue(cookiesJ3, "accessToken"));
      expect(res.status).toBe(404);
    });

    it("joueur2 (dans le pool, pas encore dans une equipe) -> 200, tableau vide", async () => {
      const res = await request(app)
        .get(`/joueurs/moi/matchs?tournoiId=${tournoi1Id}`)
        .set("Cookie", cookieValue(cookiesJ2, "accessToken"));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it("joueur1 (dans equipeA) -> 200, contient son match", async () => {
      const res = await request(app)
        .get(`/joueurs/moi/matchs?tournoiId=${tournoi1Id}`)
        .set("Cookie", cookieValue(cookiesJ1, "accessToken"));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(matchId);
    });
  });
});
