// ================================================
// TESTS D'INTEGRATION — module matchs (statut dynamique, score, report)
// ================================================
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../src/app";
import prisma from "../../src/utils/prisma";
import { cookieValue } from "../helpers";

const EMAIL_ADMIN = "test9401@koko.bj";
const EMAIL_ORGA1 = "test9402@koko.bj";
const EMAIL_ORGA2 = "test9403@koko.bj";
const MOT_DE_PASSE = "TestSuite123!";

describe("Matchs", () => {
  let adminId: number;
  let orga1Id: number;
  let orga2Id: number;
  let cookiesAdmin: string[];
  let cookiesOrga1: string[];
  let cookiesOrga2: string[];

  let tournoi1Id: number; // A_VENIR, orga1
  let tournoiTermineId: number; // dates passees, orga1
  let tournoiAnnuleId: number; // statut ANNULE, orga1

  let equipeAId: number;
  let equipeBId: number;
  let equipeAutreTournoiId: number; // appartient a tournoiTermine
  let equipeAutreTournoi2Id: number; // 2e equipe de tournoiTermine

  let matchPrincipalId: number;
  let matchScoreId: number;
  let matchAnnuleId: number;
  let matchReporteId: number;

  const userIds: number[] = [];
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

    const tournoi1 = await prisma.tournoi.create({
      data: {
        nom: "Tournoi Matchs Test", lieu: "Cotonou",
        dateDebut: new Date("2027-08-01"), dateFin: new Date("2027-08-10"),
        organisateurId: orga1Id, licencesMax: 5, equipesMax: 5,
      },
    });
    tournoi1Id = tournoi1.id;
    tournoiIds.push(tournoi1Id);

    const tournoiTermine = await prisma.tournoi.create({
      data: {
        nom: "Tournoi Termine Matchs", lieu: "Cotonou",
        dateDebut: new Date("2020-01-01"), dateFin: new Date("2020-01-05"),
        organisateurId: orga1Id, licencesMax: 5, equipesMax: 5,
      },
    });
    tournoiTermineId = tournoiTermine.id;
    tournoiIds.push(tournoiTermineId);

    const tournoiAnnule = await prisma.tournoi.create({
      data: {
        nom: "Tournoi Annule Matchs", lieu: "Cotonou",
        dateDebut: new Date("2027-09-01"), dateFin: new Date("2027-09-10"),
        organisateurId: orga1Id, licencesMax: 5, equipesMax: 5, statut: "ANNULE",
      },
    });
    tournoiAnnuleId = tournoiAnnule.id;
    tournoiIds.push(tournoiAnnuleId);

    const equipeA = await prisma.equipe.create({ data: { nom: "Lions", couleur: "#FF0000", tournoiId: tournoi1Id } });
    equipeAId = equipeA.id;
    equipeIds.push(equipeAId);

    const equipeB = await prisma.equipe.create({ data: { nom: "Tigres", couleur: "#0000FF", tournoiId: tournoi1Id } });
    equipeBId = equipeB.id;
    equipeIds.push(equipeBId);

    const equipeAutreTournoi = await prisma.equipe.create({
      data: { nom: "Panthers", couleur: "#00FF00", tournoiId: tournoiTermineId },
    });
    equipeAutreTournoiId = equipeAutreTournoi.id;
    equipeIds.push(equipeAutreTournoiId);

    const equipeAutreTournoi2 = await prisma.equipe.create({
      data: { nom: "Aigles", couleur: "#FFFF00", tournoiId: tournoiTermineId },
    });
    equipeAutreTournoi2Id = equipeAutreTournoi2.id;
    equipeIds.push(equipeAutreTournoi2Id);

    cookiesAdmin = (await request(app).post("/auth/login").send({ email: EMAIL_ADMIN, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
    cookiesOrga1 = (await request(app).post("/auth/login").send({ email: EMAIL_ORGA1, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
    cookiesOrga2 = (await request(app).post("/auth/login").send({ email: EMAIL_ORGA2, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
  });

  afterAll(async () => {
    await prisma.stat.deleteMany({ where: { matchId: { in: matchIds } } });
    await prisma.match.deleteMany({ where: { tournoiId: { in: tournoiIds } } });
    await prisma.equipeJoueur.deleteMany({ where: { tournoiId: { in: tournoiIds } } });
    await prisma.equipe.deleteMany({ where: { id: { in: equipeIds } } });
    await prisma.tournoiJoueur.deleteMany({ where: { tournoiId: { in: tournoiIds } } });
    await prisma.tournoi.deleteMany({ where: { id: { in: tournoiIds } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  describe("POST /matchs", () => {
    it("sans cookie -> 401", async () => {
      const res = await request(app).post("/matchs").send({});
      expect(res.status).toBe(401);
    });

    it("pas proprietaire -> 404", async () => {
      const res = await request(app)
        .post("/matchs")
        .set("Cookie", cookieValue(cookiesOrga2, "accessToken"))
        .send({ tournoiId: tournoi1Id, equipe1Id: equipeAId, equipe2Id: equipeBId, date: "2027-08-05T18:00:00Z", lieu: "Gymnase", type: "Poule" });
      expect(res.status).toBe(404);
    });

    it("tournoi annule -> 404", async () => {
      const res = await request(app)
        .post("/matchs")
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ tournoiId: tournoiAnnuleId, equipe1Id: equipeAId, equipe2Id: equipeBId, date: "2027-09-05T18:00:00Z", lieu: "Gymnase", type: "Poule" });
      expect(res.status).toBe(404);
    });

    it("tournoi termine -> 403", async () => {
      const res = await request(app)
        .post("/matchs")
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ tournoiId: tournoiTermineId, equipe1Id: equipeAutreTournoiId, equipe2Id: equipeAutreTournoi2Id, date: "2020-01-03T18:00:00Z", lieu: "Gymnase", type: "Poule" });
      expect(res.status).toBe(403);
    });

    it("equipe1Id === equipe2Id -> 400", async () => {
      const res = await request(app)
        .post("/matchs")
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ tournoiId: tournoi1Id, equipe1Id: equipeAId, equipe2Id: equipeAId, date: "2027-08-05T18:00:00Z", lieu: "Gymnase", type: "Poule" });
      expect(res.status).toBe(400);
    });

    it("equipe appartient a un autre tournoi -> 400", async () => {
      const res = await request(app)
        .post("/matchs")
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ tournoiId: tournoi1Id, equipe1Id: equipeAId, equipe2Id: equipeAutreTournoiId, date: "2027-08-05T18:00:00Z", lieu: "Gymnase", type: "Poule" });
      expect(res.status).toBe(400);
    });

    it("proprietaire, date future -> 201, statut A_VENIR", async () => {
      const res = await request(app)
        .post("/matchs")
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ tournoiId: tournoi1Id, equipe1Id: equipeAId, equipe2Id: equipeBId, date: "2027-08-05T18:00:00Z", lieu: "Gymnase Central", type: "Poule" });
      expect(res.status).toBe(201);
      expect(res.body.data.statut).toBe("A_VENIR");
      matchPrincipalId = res.body.data.id;
      matchIds.push(matchPrincipalId);
    });

    it("proprietaire, date passee -> 201, statut EN_RETARD", async () => {
      const res = await request(app)
        .post("/matchs")
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ tournoiId: tournoi1Id, equipe1Id: equipeAId, equipe2Id: equipeBId, date: "2020-01-01T18:00:00Z", lieu: "Gymnase Central", type: "Poule" });
      expect(res.status).toBe(201);
      expect(res.body.data.statut).toBe("EN_RETARD");
      matchScoreId = res.body.data.id;
      matchIds.push(matchScoreId);
    });
  });

  describe("GET /matchs", () => {
    it("organisateur sans tournoiId -> 400", async () => {
      const res = await request(app).get("/matchs").set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(400);
    });

    it("organisateur, tournoiId pas a lui -> 404", async () => {
      const res = await request(app)
        .get(`/matchs?tournoiId=${tournoi1Id}`)
        .set("Cookie", cookieValue(cookiesOrga2, "accessToken"));
      expect(res.status).toBe(404);
    });

    it("proprietaire -> 200", async () => {
      const res = await request(app)
        .get(`/matchs?tournoiId=${tournoi1Id}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(200);
      expect(res.body.data.some((m: any) => m.id === matchPrincipalId)).toBe(true);
    });

    it("proprietaire, filtre statut=EN_RETARD", async () => {
      const res = await request(app)
        .get(`/matchs?tournoiId=${tournoi1Id}&statut=EN_RETARD`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(200);
      expect(res.body.data.every((m: any) => m.statut === "EN_RETARD")).toBe(true);
    });

    it("ADMIN sans filtre -> 200", async () => {
      const res = await request(app).get("/matchs").set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(res.status).toBe(200);
    });
  });

  describe("GET /matchs/:id", () => {
    it("pas proprietaire -> 404", async () => {
      const res = await request(app)
        .get(`/matchs/${matchPrincipalId}`)
        .set("Cookie", cookieValue(cookiesOrga2, "accessToken"));
      expect(res.status).toBe(404);
    });

    it("proprietaire -> 200", async () => {
      const res = await request(app)
        .get(`/matchs/${matchPrincipalId}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(200);
      expect(res.body.data.equipe1.id).toBe(equipeAId);
    });
  });

  describe("PUT /matchs/:id", () => {
    it("pas proprietaire -> 404", async () => {
      const res = await request(app)
        .put(`/matchs/${matchPrincipalId}`)
        .set("Cookie", cookieValue(cookiesOrga2, "accessToken"))
        .send({ lieu: "Vole" });
      expect(res.status).toBe(404);
    });

    it("proprietaire -> 200, modifie", async () => {
      const res = await request(app)
        .put(`/matchs/${matchPrincipalId}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ lieu: "Nouveau Gymnase", arbitre: "M. Kokou" });
      expect(res.status).toBe(200);
      expect(res.body.data.lieu).toBe("Nouveau Gymnase");
    });
  });

  describe("PUT /matchs/:id/score", () => {
    it("pas proprietaire -> 404", async () => {
      const res = await request(app)
        .put(`/matchs/${matchScoreId}/score`)
        .set("Cookie", cookieValue(cookiesOrga2, "accessToken"))
        .send({ score1: 50, score2: 40 });
      expect(res.status).toBe(404);
    });

    it("score hors bornes -> 400", async () => {
      const res = await request(app)
        .put(`/matchs/${matchScoreId}/score`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ score1: -1, score2: 40 });
      expect(res.status).toBe(400);
    });

    it("saisie initiale -> 200, statut TERMINE", async () => {
      const res = await request(app)
        .put(`/matchs/${matchScoreId}/score`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ score1: 50, score2: 40 });
      expect(res.status).toBe(200);
      expect(res.body.data.statut).toBe("TERMINE");
      expect(res.body.data.nombreCorrectionsScore).toBe(0);
    });

    it("correction 1 -> 200, compteur a 1", async () => {
      const res = await request(app)
        .put(`/matchs/${matchScoreId}/score`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ score1: 52, score2: 40 });
      expect(res.status).toBe(200);
      expect(res.body.data.nombreCorrectionsScore).toBe(1);
    });

    it("correction 2 -> 200, compteur a 2", async () => {
      const res = await request(app)
        .put(`/matchs/${matchScoreId}/score`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ score1: 54, score2: 40 });
      expect(res.status).toBe(200);
      expect(res.body.data.nombreCorrectionsScore).toBe(2);
    });

    it("correction 3 (organisateur) -> 403, limite atteinte", async () => {
      const res = await request(app)
        .put(`/matchs/${matchScoreId}/score`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ score1: 56, score2: 40 });
      expect(res.status).toBe(403);
    });

    it("ADMIN peut corriger sans limite", async () => {
      const res = await request(app)
        .put(`/matchs/${matchScoreId}/score`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ score1: 60, score2: 40 });
      expect(res.status).toBe(200);
      expect(res.body.data.score1).toBe(60);
      // Le compteur de l'organisateur n'est pas touche par une correction admin.
      expect(res.body.data.nombreCorrectionsScore).toBe(2);
    });
  });

  describe("PUT /matchs/:id/annuler puis score/reporter refuses", () => {
    beforeAll(async () => {
      const match = await prisma.match.create({
        data: { tournoiId: tournoi1Id, equipe1Id: equipeAId, equipe2Id: equipeBId, date: new Date("2027-08-06T18:00:00Z"), lieu: "Gymnase", type: "Poule" },
      });
      matchAnnuleId = match.id;
      matchIds.push(matchAnnuleId);
    });

    it("pas proprietaire -> 404", async () => {
      const res = await request(app)
        .put(`/matchs/${matchAnnuleId}/annuler`)
        .set("Cookie", cookieValue(cookiesOrga2, "accessToken"));
      expect(res.status).toBe(404);
    });

    it("proprietaire -> 200, statut ANNULE", async () => {
      const res = await request(app)
        .put(`/matchs/${matchAnnuleId}/annuler`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(200);
      expect(res.body.data.statut).toBe("ANNULE");
    });

    it("saisir un score sur un match annule -> 400", async () => {
      const res = await request(app)
        .put(`/matchs/${matchAnnuleId}/score`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ score1: 10, score2: 5 });
      expect(res.status).toBe(400);
    });

    it("reporter un match annule -> 400", async () => {
      const res = await request(app)
        .put(`/matchs/${matchAnnuleId}/reporter`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(400);
    });

    it("reactiver -> 200, statut recalcule normalement", async () => {
      const res = await request(app)
        .put(`/matchs/${matchAnnuleId}/reactiver`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(200);
      expect(res.body.data.statut).not.toBe("ANNULE");
    });
  });

  describe("PUT /matchs/:id/reporter puis reprogrammer", () => {
    beforeAll(async () => {
      const match = await prisma.match.create({
        data: { tournoiId: tournoi1Id, equipe1Id: equipeAId, equipe2Id: equipeBId, date: new Date("2027-08-07T18:00:00Z"), lieu: "Gymnase", type: "Poule" },
      });
      matchReporteId = match.id;
      matchIds.push(matchReporteId);
    });

    it("reprogrammer un match pas encore reporte -> 400", async () => {
      const res = await request(app)
        .put(`/matchs/${matchReporteId}/reprogrammer`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ nouvelleDate: "2027-08-20T18:00:00Z" });
      expect(res.status).toBe(400);
    });

    it("pas proprietaire -> 404", async () => {
      const res = await request(app)
        .put(`/matchs/${matchReporteId}/reporter`)
        .set("Cookie", cookieValue(cookiesOrga2, "accessToken"));
      expect(res.status).toBe(404);
    });

    it("proprietaire -> 200, statut REPORTE, dateOriginale sauvegardee", async () => {
      const res = await request(app)
        .put(`/matchs/${matchReporteId}/reporter`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(200);
      expect(res.body.data.statut).toBe("REPORTE");
      expect(res.body.data.dateOriginale).not.toBeNull();
    });

    it("reactiver un match REPORTE (pas ANNULE) -> 400, ne contourne pas reprogrammer", async () => {
      const res = await request(app)
        .put(`/matchs/${matchReporteId}/reactiver`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(400);
    });

    it("reporter un match deja REPORTE -> 400", async () => {
      const res = await request(app)
        .put(`/matchs/${matchReporteId}/reporter`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(400);
    });

    it("saisir un score sur un match REPORTE -> 400", async () => {
      const res = await request(app)
        .put(`/matchs/${matchReporteId}/score`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ score1: 10, score2: 5 });
      expect(res.status).toBe(400);
    });

    it("reprogrammer -> 200, nouvelle date, statut redevient A_VENIR", async () => {
      const res = await request(app)
        .put(`/matchs/${matchReporteId}/reprogrammer`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ nouvelleDate: "2027-08-20T18:00:00Z" });
      expect(res.status).toBe(200);
      expect(res.body.data.statut).toBe("A_VENIR");
      expect(new Date(res.body.data.date).toISOString().slice(0, 10)).toBe("2027-08-20");
    });

    it("un 2e report garde la toute PREMIERE dateOriginale", async () => {
      const avant = await prisma.match.findUnique({ where: { id: matchReporteId } });

      await request(app).put(`/matchs/${matchReporteId}/reporter`).set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      await request(app)
        .put(`/matchs/${matchReporteId}/reprogrammer`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ nouvelleDate: "2027-08-25T18:00:00Z" });

      const apres = await prisma.match.findUnique({ where: { id: matchReporteId } });
      expect(apres!.dateOriginale?.toISOString()).toBe(avant!.dateOriginale?.toISOString());
    });
  });
});
