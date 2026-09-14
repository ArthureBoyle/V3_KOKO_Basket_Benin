// ================================================
// TESTS D'INTEGRATION — module stats
// ================================================
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../src/app";
import prisma from "../../src/utils/prisma";
import { cookieValue } from "../helpers";

const EMAIL_ADMIN = "test9501@koko.bj";
const EMAIL_ORGA1 = "test9502@koko.bj";
const EMAIL_ORGA2 = "test9503@koko.bj";
const EMAIL_J1 = "test9504@koko.bj";
const EMAIL_J2 = "test9505@koko.bj";
const EMAIL_J3 = "test9506@koko.bj";
const MOT_DE_PASSE = "TestSuite123!";

describe("Stats", () => {
  let adminId: number;
  let orga1Id: number;
  let orga2Id: number;
  let cookiesAdmin: string[];
  let cookiesOrga1: string[];
  let cookiesOrga2: string[];

  let tournoi1Id: number;
  let equipeAId: number;
  let equipeBId: number;
  let joueur1Id: number; // dans equipeA
  let joueur2Id: number; // dans equipeB
  let joueur3Id: number; // dans le pool, mais dans AUCUNE equipe

  let matchTermineId: number; // score deja saisi -> TERMINE
  let matchPasTermineId: number; // pas de score -> pas TERMINE

  const userIds: number[] = [];
  const joueurIds: number[] = [];
  const tournoiIds: number[] = [];
  const equipeIds: number[] = [];
  const matchIds: number[] = [];

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

    const creerJoueur = async (email: string, idKoko: string, prenom: string) => {
      const user = await prisma.user.create({
        data: { email, motDePasse: hash, role: "JOUEUR", nom: "Joueur", prenom },
      });
      userIds.push(user.id);
      const joueur = await prisma.joueur.create({ data: { dateNaissance: new Date("2000-01-01"), idKoko, nomLegal: "Joueur", prenom, userId: user.id } });
      joueurIds.push(joueur.id);
      return joueur.id;
    };

    joueur1Id = await creerJoueur(EMAIL_J1, "KOKO-2026-5111", "J1");
    joueur2Id = await creerJoueur(EMAIL_J2, "KOKO-2026-5222", "J2");
    joueur3Id = await creerJoueur(EMAIL_J3, "KOKO-2026-5333", "J3");

    const tournoi1 = await prisma.tournoi.create({
      data: {
        nom: "Tournoi Stats Test", lieu: "Cotonou",
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

    // Pool : les 3 joueurs assignes au tournoi.
    await prisma.tournoiJoueur.createMany({
      data: [
        { tournoiId: tournoi1Id, joueurId: joueur1Id },
        { tournoiId: tournoi1Id, joueurId: joueur2Id },
        { tournoiId: tournoi1Id, joueurId: joueur3Id },
      ],
    });

    // Composition d'equipe : joueur1 -> equipeA, joueur2 -> equipeB.
    // joueur3 reste dans le pool mais dans AUCUNE equipe.
    await prisma.equipeJoueur.create({
      data: { equipeId: equipeAId, tournoiId: tournoi1Id, joueurId: joueur1Id, numeroDeMaillot: 7 },
    });
    await prisma.equipeJoueur.create({
      data: { equipeId: equipeBId, tournoiId: tournoi1Id, joueurId: joueur2Id, numeroDeMaillot: 9 },
    });

    const matchTermine = await prisma.match.create({
      data: {
        tournoiId: tournoi1Id, equipe1Id: equipeAId, equipe2Id: equipeBId,
        date: new Date("2027-08-05T18:00:00Z"), lieu: "Gymnase", type: "Poule",
        score1: 50, score2: 40,
      },
    });
    matchTermineId = matchTermine.id;
    matchIds.push(matchTermineId);

    const matchPasTermine = await prisma.match.create({
      data: {
        tournoiId: tournoi1Id, equipe1Id: equipeAId, equipe2Id: equipeBId,
        date: new Date("2027-08-06T18:00:00Z"), lieu: "Gymnase", type: "Poule",
      },
    });
    matchPasTermineId = matchPasTermine.id;
    matchIds.push(matchPasTermineId);

    cookiesAdmin = (await request(app).post("/auth/login").send({ email: EMAIL_ADMIN, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
    cookiesOrga1 = (await request(app).post("/auth/login").send({ email: EMAIL_ORGA1, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
    cookiesOrga2 = (await request(app).post("/auth/login").send({ email: EMAIL_ORGA2, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
  });

  afterAll(async () => {
    await prisma.stat.deleteMany({ where: { matchId: { in: matchIds } } });
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

  describe("PUT /matchs/:id/stats/:joueurId", () => {
    it("sans cookie -> 401", async () => {
      const res = await request(app).put(`/matchs/${matchTermineId}/stats/${joueur1Id}`).send({});
      expect(res.status).toBe(401);
    });

    it("pas proprietaire -> 404", async () => {
      const res = await request(app)
        .put(`/matchs/${matchTermineId}/stats/${joueur1Id}`)
        .set("Cookie", cookieValue(cookiesOrga2, "accessToken"))
        .send({ equipeId: equipeAId, points: 20, fautes: 2, contres: 1, tempsJeu: 30 });
      expect(res.status).toBe(404);
    });

    it("match pas encore TERMINE -> 400", async () => {
      const res = await request(app)
        .put(`/matchs/${matchPasTermineId}/stats/${joueur1Id}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ equipeId: equipeAId, points: 20, fautes: 2, contres: 1, tempsJeu: 30 });
      expect(res.status).toBe(400);
    });

    it("fautes > 5 -> 400", async () => {
      const res = await request(app)
        .put(`/matchs/${matchTermineId}/stats/${joueur1Id}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ equipeId: equipeAId, points: 20, fautes: 6, contres: 1, tempsJeu: 30 });
      expect(res.status).toBe(400);
    });

    it("equipeId hors du match (ni equipe1 ni equipe2) -> 404", async () => {
      const res = await request(app)
        .put(`/matchs/${matchTermineId}/stats/${joueur1Id}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ equipeId: 999999, points: 20, fautes: 2, contres: 1, tempsJeu: 30 });
      expect(res.status).toBe(404);
    });

    it("joueur3, dans le pool mais dans AUCUNE equipe -> 404", async () => {
      const res = await request(app)
        .put(`/matchs/${matchTermineId}/stats/${joueur3Id}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ equipeId: equipeAId, points: 20, fautes: 2, contres: 1, tempsJeu: 30 });
      expect(res.status).toBe(404);
    });

    it("joueur1 declare avec la mauvaise equipe (equipeB au lieu de equipeA) -> 404", async () => {
      const res = await request(app)
        .put(`/matchs/${matchTermineId}/stats/${joueur1Id}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ equipeId: equipeBId, points: 20, fautes: 2, contres: 1, tempsJeu: 30 });
      expect(res.status).toBe(404);
    });

    it("saisie initiale valide -> 201", async () => {
      const res = await request(app)
        .put(`/matchs/${matchTermineId}/stats/${joueur1Id}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ equipeId: equipeAId, points: 20, fautes: 2, contres: 1, tempsJeu: 30 });
      expect(res.status).toBe(201);
      expect(res.body.data.nombreCorrections).toBe(0);
    });

    it("correction 1 -> 200, compteur a 1", async () => {
      const res = await request(app)
        .put(`/matchs/${matchTermineId}/stats/${joueur1Id}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ equipeId: equipeAId, points: 22, fautes: 2, contres: 1, tempsJeu: 30 });
      expect(res.status).toBe(200);
      expect(res.body.data.nombreCorrections).toBe(1);
    });

    it("correction 2 -> 200, compteur a 2", async () => {
      const res = await request(app)
        .put(`/matchs/${matchTermineId}/stats/${joueur1Id}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ equipeId: equipeAId, points: 24, fautes: 2, contres: 1, tempsJeu: 30 });
      expect(res.status).toBe(200);
      expect(res.body.data.nombreCorrections).toBe(2);
    });

    it("correction 3 (organisateur) -> 403", async () => {
      const res = await request(app)
        .put(`/matchs/${matchTermineId}/stats/${joueur1Id}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ equipeId: equipeAId, points: 26, fautes: 2, contres: 1, tempsJeu: 30 });
      expect(res.status).toBe(403);
    });

    it("ADMIN corrige sans limite", async () => {
      const res = await request(app)
        .put(`/matchs/${matchTermineId}/stats/${joueur1Id}`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ equipeId: equipeAId, points: 28, fautes: 2, contres: 1, tempsJeu: 30 });
      expect(res.status).toBe(200);
      expect(res.body.data.points).toBe(28);
      expect(res.body.data.nombreCorrections).toBe(2);
    });

    it("joueur2 (equipeB), saisie initiale -> 201", async () => {
      const res = await request(app)
        .put(`/matchs/${matchTermineId}/stats/${joueur2Id}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ equipeId: equipeBId, points: 15, fautes: 3, contres: 1, tempsJeu: 25 });
      expect(res.status).toBe(201);
    });
  });

  describe("GET /matchs/:id/stats", () => {
    it("pas proprietaire -> 404", async () => {
      const res = await request(app)
        .get(`/matchs/${matchTermineId}/stats`)
        .set("Cookie", cookieValue(cookiesOrga2, "accessToken"));
      expect(res.status).toBe(404);
    });

    it("proprietaire -> 200, contient les 2 joueurs", async () => {
      const res = await request(app)
        .get(`/matchs/${matchTermineId}/stats`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.some((s: any) => s.joueur.id === joueur1Id)).toBe(true);
    });
  });

  describe("DELETE /matchs/:id/stats/:joueurId", () => {
    it("pas ADMIN -> 403", async () => {
      const res = await request(app)
        .delete(`/matchs/${matchTermineId}/stats/${joueur2Id}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(403);
    });

    it("ADMIN -> 200", async () => {
      const res = await request(app)
        .delete(`/matchs/${matchTermineId}/stats/${joueur2Id}`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(res.status).toBe(200);
    });

    it("deja supprimee -> 404", async () => {
      const res = await request(app)
        .delete(`/matchs/${matchTermineId}/stats/${joueur2Id}`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(res.status).toBe(404);
    });
  });

  // Retirer un joueur du tournoi = fin de sa certification. Ses stats ne
  // sont jamais supprimees, seulement masquees tant qu'il n'est plus
  // certifie, et elles reviennent s'il est reajoute au pool.
  describe("Retrait de joueur1 du tournoi (fin de certification)", () => {
    it("ADMIN retire joueur1 -> 200, ses stats restent en base", async () => {
      const res = await request(app)
        .delete(`/tournois/${tournoi1Id}/joueurs/${joueur1Id}`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(res.status).toBe(200);

      const statsEnBase = await prisma.stat.count({ where: { matchId: matchTermineId, joueurId: joueur1Id } });
      expect(statsEnBase).toBe(1);
    });

    it("organisateur : ses stats sont masquees de la feuille de match", async () => {
      const res = await request(app)
        .get(`/matchs/${matchTermineId}/stats`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(200);
      expect(res.body.data.some((s: any) => s.joueurId === joueur1Id)).toBe(false);
    });

    it("ADMIN : ses stats restent visibles, marquees retireDuTournoi", async () => {
      const res = await request(app)
        .get(`/matchs/${matchTermineId}/stats`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(res.status).toBe(200);
      const stat = res.body.data.find((s: any) => s.joueurId === joueur1Id);
      expect(stat.retireDuTournoi).toBe(true);
    });

    it("classement : joueur1 n'apparait plus", async () => {
      const res = await request(app)
        .get(`/tournois/${tournoi1Id}/classement`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(200);
      expect(res.body.data.some((j: any) => j.joueurId === joueur1Id)).toBe(false);
    });

    it("nouvelle stat pour joueur1 -> 404 (plus dans aucune equipe)", async () => {
      const res = await request(app)
        .put(`/matchs/${matchTermineId}/stats/${joueur1Id}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ equipeId: equipeAId, points: 10, fautes: 1, contres: 0, tempsJeu: 20 });
      expect(res.status).toBe(404);
    });

    it("reajoute au pool -> ses anciennes stats reapparaissent au classement", async () => {
      const ajout = await request(app)
        .post(`/tournois/${tournoi1Id}/joueurs`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ idKoko: "KOKO-2026-5111" });
      expect(ajout.status).toBe(201);

      const res = await request(app)
        .get(`/tournois/${tournoi1Id}/classement`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.body.data.some((j: any) => j.joueurId === joueur1Id)).toBe(true);
    });
  });
});
