// ================================================
// TESTS D'INTEGRATION — module equipes (+ pool de licences TournoiJoueur)
// ================================================
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../src/app";
import prisma from "../../src/utils/prisma";
import { cookieValue } from "../helpers";

const EMAIL_ADMIN = "test9301@koko.bj";
const EMAIL_ORGA1 = "test9302@koko.bj";
const EMAIL_ORGA2 = "test9303@koko.bj";
const EMAIL_J1 = "test9304@koko.bj";
const EMAIL_J2 = "test9305@koko.bj";
const EMAIL_J3 = "test9306@koko.bj";
const MOT_DE_PASSE = "TestSuite123!";

describe("Equipes + pool de licences", () => {
  let adminId: number;
  let orga1Id: number;
  let orga2Id: number;
  let cookiesAdmin: string[];
  let cookiesOrga1: string[];
  let cookiesOrga2: string[];

  let joueur1Id: number;
  let joueur2Id: number;
  let joueur3Id: number;

  let tournoi1Id: number; // A_VENIR, appartient a orga1, licencesMax=2, equipesMax=1
  let tournoiTermineId: number; // dates passees, appartient a orga1
  let tournoiAnnuleId: number; // statut ANNULE force, appartient a orga1

  let equipe1Id: number;

  const userIds: number[] = [];
  const joueurIds: number[] = [];
  const tournoiIds: number[] = [];

  beforeAll(async () => {
    const hash = await bcrypt.hash(MOT_DE_PASSE, 10);

    const admin = await prisma.user.create({
      data: { email: EMAIL_ADMIN, motDePasse: hash, role: "ADMIN", nom: "S", prenom: "Admin", mustChangePassword: false },
    });
    adminId = admin.id;
    userIds.push(adminId);

    const orga1 = await prisma.user.create({
      data: { email: EMAIL_ORGA1, motDePasse: hash, role: "ORGANISATEUR", nom: "S", prenom: "Orga1", mustChangePassword: false },
    });
    orga1Id = orga1.id;
    userIds.push(orga1Id);

    const orga2 = await prisma.user.create({
      data: { email: EMAIL_ORGA2, motDePasse: hash, role: "ORGANISATEUR", nom: "S", prenom: "Orga2", mustChangePassword: false },
    });
    orga2Id = orga2.id;
    userIds.push(orga2Id);

    const creerJoueur = async (email: string, idKoko: string, prenom: string) => {
      const user = await prisma.user.create({
        data: { email, motDePasse: hash, role: "JOUEUR", nom: "Joueur", prenom, mustChangePassword: false },
      });
      userIds.push(user.id);
      const joueur = await prisma.joueur.create({
        data: { idKoko, nomLegal: "Joueur", prenom, userId: user.id },
      });
      joueurIds.push(joueur.id);
      return joueur.id;
    };

    joueur1Id = await creerJoueur(EMAIL_J1, "KOKO-2026-1111", "J1");
    joueur2Id = await creerJoueur(EMAIL_J2, "KOKO-2026-2222", "J2");
    joueur3Id = await creerJoueur(EMAIL_J3, "KOKO-2026-3333", "J3");

    const tournoi1 = await prisma.tournoi.create({
      data: {
        nom: "Tournoi Equipes Test",
        lieu: "Cotonou",
        dateDebut: new Date("2027-08-01"),
        dateFin: new Date("2027-08-10"),
        organisateurId: orga1Id,
        licencesMax: 2,
        equipesMax: 1,
      },
    });
    tournoi1Id = tournoi1.id;
    tournoiIds.push(tournoi1Id);

    const tournoiTermine = await prisma.tournoi.create({
      data: {
        nom: "Tournoi Termine Test",
        lieu: "Cotonou",
        dateDebut: new Date("2020-01-01"),
        dateFin: new Date("2020-01-05"),
        organisateurId: orga1Id,
        licencesMax: 5,
        equipesMax: 5,
      },
    });
    tournoiTermineId = tournoiTermine.id;
    tournoiIds.push(tournoiTermineId);

    const tournoiAnnule = await prisma.tournoi.create({
      data: {
        nom: "Tournoi Annule Test",
        lieu: "Cotonou",
        dateDebut: new Date("2027-09-01"),
        dateFin: new Date("2027-09-10"),
        organisateurId: orga1Id,
        licencesMax: 5,
        equipesMax: 5,
        statut: "ANNULE",
      },
    });
    tournoiAnnuleId = tournoiAnnule.id;
    tournoiIds.push(tournoiAnnuleId);

    cookiesAdmin = (await request(app).post("/auth/login").send({ email: EMAIL_ADMIN, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
    cookiesOrga1 = (await request(app).post("/auth/login").send({ email: EMAIL_ORGA1, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
    cookiesOrga2 = (await request(app).post("/auth/login").send({ email: EMAIL_ORGA2, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
  });

  afterAll(async () => {
    await prisma.equipeJoueur.deleteMany({ where: { tournoiId: { in: tournoiIds } } });
    await prisma.equipe.deleteMany({ where: { tournoiId: { in: tournoiIds } } });
    await prisma.tournoiJoueur.deleteMany({ where: { tournoiId: { in: tournoiIds } } });
    await prisma.tournoi.deleteMany({ where: { id: { in: tournoiIds } } });
    await prisma.joueur.deleteMany({ where: { id: { in: joueurIds } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  describe("POST /tournois/:id/joueurs (assigner au pool)", () => {
    it("sans cookie -> 401", async () => {
      const res = await request(app).post(`/tournois/${tournoi1Id}/joueurs`).send({ idKoko: "KOKO-2026-1111" });
      expect(res.status).toBe(401);
    });

    it("pas ADMIN -> 403", async () => {
      const res = await request(app)
        .post(`/tournois/${tournoi1Id}/joueurs`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ idKoko: "KOKO-2026-1111" });
      expect(res.status).toBe(403);
    });

    it("idKoko inexistant -> 404", async () => {
      const res = await request(app)
        .post(`/tournois/${tournoi1Id}/joueurs`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ idKoko: "KOKO-2026-9999" });
      expect(res.status).toBe(404);
    });

    it("ADMIN, joueur1 -> 201", async () => {
      const res = await request(app)
        .post(`/tournois/${tournoi1Id}/joueurs`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ idKoko: "KOKO-2026-1111" });
      expect(res.status).toBe(201);
    });

    it("ADMIN, joueur2 -> 201 (licencesMax=2 atteint)", async () => {
      const res = await request(app)
        .post(`/tournois/${tournoi1Id}/joueurs`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ idKoko: "KOKO-2026-2222" });
      expect(res.status).toBe(201);
    });

    it("ADMIN, joueur3 -> 400 (limite de licences atteinte)", async () => {
      const res = await request(app)
        .post(`/tournois/${tournoi1Id}/joueurs`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ idKoko: "KOKO-2026-3333" });
      expect(res.status).toBe(400);
    });

    it("ADMIN, joueur1 deja assigne -> 400", async () => {
      const res = await request(app)
        .post(`/tournois/${tournoi1Id}/joueurs`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ idKoko: "KOKO-2026-1111" });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /tournois/:id/joueurs (pool)", () => {
    it("pas proprietaire -> 404", async () => {
      const res = await request(app)
        .get(`/tournois/${tournoi1Id}/joueurs`)
        .set("Cookie", cookieValue(cookiesOrga2, "accessToken"));
      expect(res.status).toBe(404);
    });

    it("proprietaire -> 200, contient joueur1 et joueur2, sans equipe", async () => {
      const res = await request(app)
        .get(`/tournois/${tournoi1Id}/joueurs`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every((j: any) => j.equipeId === null)).toBe(true);
    });

    it("ADMIN -> 200", async () => {
      const res = await request(app)
        .get(`/tournois/${tournoi1Id}/joueurs`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(res.status).toBe(200);
    });
  });

  describe("POST /equipes", () => {
    it("sans cookie -> 401", async () => {
      const res = await request(app).post("/equipes").send({ tournoiId: tournoi1Id, nom: "X", couleur: "#FF0000" });
      expect(res.status).toBe(401);
    });

    it("pas proprietaire -> 404", async () => {
      const res = await request(app)
        .post("/equipes")
        .set("Cookie", cookieValue(cookiesOrga2, "accessToken"))
        .send({ tournoiId: tournoi1Id, nom: "Vole", couleur: "#FF0000" });
      expect(res.status).toBe(404);
    });

    it("tournoi annule -> 404", async () => {
      const res = await request(app)
        .post("/equipes")
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ tournoiId: tournoiAnnuleId, nom: "X", couleur: "#FF0000" });
      expect(res.status).toBe(404);
    });

    it("tournoi termine -> 403", async () => {
      const res = await request(app)
        .post("/equipes")
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ tournoiId: tournoiTermineId, nom: "X", couleur: "#FF0000" });
      expect(res.status).toBe(403);
    });

    it("proprietaire -> 201", async () => {
      const res = await request(app)
        .post("/equipes")
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ tournoiId: tournoi1Id, nom: "Les Lions", couleur: "#FF0000" });
      expect(res.status).toBe(201);
      equipe1Id = res.body.data.id;
    });

    it("equipesMax=1 atteint -> 400", async () => {
      const res = await request(app)
        .post("/equipes")
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ tournoiId: tournoi1Id, nom: "Les Tigres", couleur: "#0000FF" });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /equipes", () => {
    it("organisateur sans tournoiId -> 400", async () => {
      const res = await request(app).get("/equipes").set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(400);
    });

    it("organisateur, tournoiId pas a lui -> 404", async () => {
      const res = await request(app)
        .get(`/equipes?tournoiId=${tournoi1Id}`)
        .set("Cookie", cookieValue(cookiesOrga2, "accessToken"));
      expect(res.status).toBe(404);
    });

    it("proprietaire -> 200", async () => {
      const res = await request(app)
        .get(`/equipes?tournoiId=${tournoi1Id}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(200);
      expect(res.body.data.some((e: any) => e.id === equipe1Id)).toBe(true);
    });

    it("ADMIN sans filtre -> 200", async () => {
      const res = await request(app).get("/equipes").set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(res.status).toBe(200);
    });
  });

  describe("GET /equipes/:id", () => {
    it("pas proprietaire -> 404", async () => {
      const res = await request(app)
        .get(`/equipes/${equipe1Id}`)
        .set("Cookie", cookieValue(cookiesOrga2, "accessToken"));
      expect(res.status).toBe(404);
    });

    it("proprietaire -> 200", async () => {
      const res = await request(app)
        .get(`/equipes/${equipe1Id}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(200);
    });

    it("ADMIN -> 200", async () => {
      const res = await request(app)
        .get(`/equipes/${equipe1Id}`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(res.status).toBe(200);
    });
  });

  describe("POST /equipes/:id/joueurs", () => {
    it("joueur pas dans le pool -> 404", async () => {
      const res = await request(app)
        .post(`/equipes/${equipe1Id}/joueurs`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ joueurId: joueur3Id, numeroDeMaillot: 7 });
      expect(res.status).toBe(404);
    });

    it("joueur1 (dans le pool) -> 201", async () => {
      const res = await request(app)
        .post(`/equipes/${equipe1Id}/joueurs`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ joueurId: joueur1Id, numeroDeMaillot: 7 });
      expect(res.status).toBe(201);
    });

    it("joueur1 deja dans une equipe du tournoi -> 400", async () => {
      const res = await request(app)
        .post(`/equipes/${equipe1Id}/joueurs`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ joueurId: joueur1Id, numeroDeMaillot: 8 });
      expect(res.status).toBe(400);
    });

    it("joueur2, numero 7 deja pris -> 400", async () => {
      const res = await request(app)
        .post(`/equipes/${equipe1Id}/joueurs`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ joueurId: joueur2Id, numeroDeMaillot: 7 });
      expect(res.status).toBe(400);
    });

    it("joueur2, numero 8 -> 201", async () => {
      const res = await request(app)
        .post(`/equipes/${equipe1Id}/joueurs`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ joueurId: joueur2Id, numeroDeMaillot: 8 });
      expect(res.status).toBe(201);
    });
  });

  describe("GET /tournois/:id/joueurs (apres affectation aux equipes)", () => {
    it("proprietaire -> equipeId renseigne pour joueur1 et joueur2", async () => {
      const res = await request(app)
        .get(`/tournois/${tournoi1Id}/joueurs`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(200);
      const j1 = res.body.data.find((j: any) => j.id === joueur1Id);
      expect(j1.equipeId).toBe(equipe1Id);
    });
  });

  describe("DELETE /equipes/:id, equipe non vide", () => {
    it("-> 400, refuse tant qu'il reste des joueurs", async () => {
      const res = await request(app)
        .delete(`/equipes/${equipe1Id}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /tournois/:id/joueurs/:joueurId (retrait du tournoi = fin de certification)", () => {
    it("pas ADMIN -> 403", async () => {
      const res = await request(app)
        .delete(`/tournois/${tournoi1Id}/joueurs/${joueur1Id}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(403);
    });

    it("joueur inconnu du pool -> 404", async () => {
      const res = await request(app)
        .delete(`/tournois/${tournoi1Id}/joueurs/${joueur3Id}`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(res.status).toBe(404);
    });

    it("joueur1, encore dans une equipe -> 200, retire du pool ET de son equipe en une fois", async () => {
      const res = await request(app)
        .delete(`/tournois/${tournoi1Id}/joueurs/${joueur1Id}`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(res.status).toBe(200);

      const dansEquipe = await prisma.equipeJoueur.findFirst({ where: { tournoiId: tournoi1Id, joueurId: joueur1Id } });
      const dansPool = await prisma.tournoiJoueur.findFirst({ where: { tournoiId: tournoi1Id, joueurId: joueur1Id } });
      expect(dansEquipe).toBeNull();
      expect(dansPool).toBeNull();
    });
  });

  describe("DELETE /equipes/:id/joueurs/:joueurId (retirer de l'equipe)", () => {
    it("joueur pas dans l'equipe -> 404", async () => {
      const res = await request(app)
        .delete(`/equipes/${equipe1Id}/joueurs/${joueur3Id}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(404);
    });

    it("joueur2 -> 200", async () => {
      const res = await request(app)
        .delete(`/equipes/${equipe1Id}/joueurs/${joueur2Id}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(200);
    });

    it("joueur1, deja sorti de l'equipe avec le retrait du tournoi -> 404", async () => {
      const res = await request(app)
        .delete(`/equipes/${equipe1Id}/joueurs/${joueur1Id}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /equipes/:id", () => {
    it("ADMIN -> 200, equipe vide supprimee", async () => {
      const res = await request(app)
        .delete(`/equipes/${equipe1Id}`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(res.status).toBe(200);
    });
  });
});
