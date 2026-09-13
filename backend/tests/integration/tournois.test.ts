// ================================================
// TESTS D'INTEGRATION — module tournois
// ================================================
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../src/app";
import prisma from "../../src/utils/prisma";
import { cookieValue } from "../helpers";

const EMAIL_ADMIN = "test9201@koko.bj";
const EMAIL_ORGA1 = "test9202@koko.bj";
const EMAIL_ORGA2 = "test9203@koko.bj";
const MOT_DE_PASSE = "TestSuite123!";

describe("Tournois", () => {
  let adminId: number;
  let orga1Id: number;
  let orga2Id: number;
  let cookiesAdmin: string[];
  let cookiesOrga1: string[];
  let cookiesOrga2: string[];
  let tournoiId: number;
  const idsTournoisCrees: number[] = [];

  beforeAll(async () => {
    const hash = await bcrypt.hash(MOT_DE_PASSE, 10);

    const admin = await prisma.user.create({
      data: { email: EMAIL_ADMIN, motDePasse: hash, role: "ADMIN", nom: "S", prenom: "Admin", mustChangePassword: false },
    });
    adminId = admin.id;

    const orga1 = await prisma.user.create({
      data: { email: EMAIL_ORGA1, motDePasse: hash, role: "ORGANISATEUR", nom: "S", prenom: "Orga1", mustChangePassword: false },
    });
    orga1Id = orga1.id;

    const orga2 = await prisma.user.create({
      data: { email: EMAIL_ORGA2, motDePasse: hash, role: "ORGANISATEUR", nom: "S", prenom: "Orga2", mustChangePassword: false },
    });
    orga2Id = orga2.id;

    cookiesAdmin = (await request(app).post("/auth/login").send({ email: EMAIL_ADMIN, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
    cookiesOrga1 = (await request(app).post("/auth/login").send({ email: EMAIL_ORGA1, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
    cookiesOrga2 = (await request(app).post("/auth/login").send({ email: EMAIL_ORGA2, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
  });

  afterAll(async () => {
    await prisma.tournoi.deleteMany({ where: { id: { in: idsTournoisCrees } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: [adminId, orga1Id, orga2Id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, orga1Id, orga2Id] } } });
    await prisma.$disconnect();
  });

  describe("POST /tournois", () => {
    it("sans cookie -> 401", async () => {
      const res = await request(app).post("/tournois").send({});
      expect(res.status).toBe(401);
    });

    it("pas ADMIN -> 403", async () => {
      const res = await request(app)
        .post("/tournois")
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({
          nom: "X",
          lieu: "Y",
          dateDebut: "2027-01-01",
          dateFin: "2027-01-05",
          organisateurId: orga1Id,
          licencesMax: 10,
          equipesMax: 4,
        });
      expect(res.status).toBe(403);
    });

    it("dateFin avant dateDebut -> 400", async () => {
      const res = await request(app)
        .post("/tournois")
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({
          nom: "X",
          lieu: "Y",
          dateDebut: "2027-01-10",
          dateFin: "2027-01-05",
          organisateurId: orga1Id,
          licencesMax: 10,
          equipesMax: 4,
        });
      expect(res.status).toBe(400);
    });

    it("organisateurId ne pointe pas vers un ORGANISATEUR -> 400", async () => {
      const res = await request(app)
        .post("/tournois")
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({
          nom: "X",
          lieu: "Y",
          dateDebut: "2027-01-01",
          dateFin: "2027-01-05",
          organisateurId: adminId,
          licencesMax: 10,
          equipesMax: 4,
        });
      expect(res.status).toBe(400);
    });

    it("sans licencesMax/equipesMax -> 400", async () => {
      const res = await request(app)
        .post("/tournois")
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ nom: "X", lieu: "Y", dateDebut: "2027-01-01", dateFin: "2027-01-05", organisateurId: orga1Id });
      expect(res.status).toBe(400);
    });

    it("ADMIN, tout valide -> 201", async () => {
      const res = await request(app)
        .post("/tournois")
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({
          nom: "Tournoi Test",
          lieu: "Cotonou",
          dateDebut: "2027-06-01",
          dateFin: "2027-06-10",
          organisateurId: orga1Id,
          licencesMax: 10,
          equipesMax: 4,
        });
      expect(res.status).toBe(201);
      expect(res.body.data.statut).toBe("A_VENIR");
      expect(res.body.data.licencesMax).toBe(10);
      expect(res.body.data.equipesMax).toBe(4);
      tournoiId = res.body.data.id;
      idsTournoisCrees.push(tournoiId);
    });

    it("chevauchement de dates pour le meme organisateur -> 400", async () => {
      const res = await request(app)
        .post("/tournois")
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({
          nom: "Tournoi Chevauche",
          lieu: "Cotonou",
          dateDebut: "2027-06-05",
          dateFin: "2027-06-15",
          organisateurId: orga1Id,
          licencesMax: 10,
          equipesMax: 4,
        });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /tournois (ADMIN)", () => {
    it("pas ADMIN -> 403", async () => {
      const res = await request(app).get("/tournois").set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(403);
    });

    it("ADMIN -> 200, filtrable par organisateurId", async () => {
      const res = await request(app)
        .get(`/tournois?organisateurId=${orga1Id}`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(res.status).toBe(200);
      expect(res.body.data.every((t: any) => t.organisateurId === orga1Id)).toBe(true);
    });
  });

  describe("GET /tournois/mes-tournois", () => {
    it("orga1 voit son tournoi", async () => {
      const res = await request(app).get("/tournois/mes-tournois").set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(200);
      expect(res.body.data.some((t: any) => t.id === tournoiId)).toBe(true);
    });

    it("orga2 ne voit pas le tournoi d'orga1", async () => {
      const res = await request(app).get("/tournois/mes-tournois").set("Cookie", cookieValue(cookiesOrga2, "accessToken"));
      expect(res.status).toBe(200);
      expect(res.body.data.some((t: any) => t.id === tournoiId)).toBe(false);
    });
  });

  describe("GET /tournois/:id", () => {
    it("proprietaire -> 200", async () => {
      const res = await request(app).get(`/tournois/${tournoiId}`).set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(200);
    });

    it("pas proprietaire -> 404 (pas 403)", async () => {
      const res = await request(app).get(`/tournois/${tournoiId}`).set("Cookie", cookieValue(cookiesOrga2, "accessToken"));
      expect(res.status).toBe(404);
    });

    it("ADMIN -> 200, tout tournoi", async () => {
      const res = await request(app).get(`/tournois/${tournoiId}`).set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(res.status).toBe(200);
    });
  });

  describe("PUT /tournois/:id", () => {
    it("pas proprietaire -> 404", async () => {
      const res = await request(app)
        .put(`/tournois/${tournoiId}`)
        .set("Cookie", cookieValue(cookiesOrga2, "accessToken"))
        .send({ nom: "Vole" });
      expect(res.status).toBe(404);
    });

    it("proprietaire -> 200, modifie", async () => {
      const res = await request(app)
        .put(`/tournois/${tournoiId}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ nom: "Tournoi Renomme" });
      expect(res.status).toBe(200);
      expect(res.body.data.nom).toBe("Tournoi Renomme");
    });

    it("organisateur qui envoie une date, meme coherente -> 403, jamais autorise", async () => {
      const res = await request(app)
        .put(`/tournois/${tournoiId}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ dateFin: "2027-06-20" }); // date parfaitement valide, refusee quand meme
      expect(res.status).toBe(403);
    });

    it("organisateur qui envoie equipesMax -> 403", async () => {
      const res = await request(app)
        .put(`/tournois/${tournoiId}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ equipesMax: 10 });
      expect(res.status).toBe(403);
    });

    it("organisateur qui envoie coefficientMalusFautes -> 403", async () => {
      const res = await request(app)
        .put(`/tournois/${tournoiId}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ coefficientMalusFautes: 2 });
      expect(res.status).toBe(403);
    });

    it("ADMIN peut modifier les dates", async () => {
      const res = await request(app)
        .put(`/tournois/${tournoiId}`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ dateFin: "2027-06-20" });
      expect(res.status).toBe(200);
      expect(new Date(res.body.data.dateFin).toISOString().slice(0, 10)).toBe("2027-06-20");
    });

    it("ADMIN peut modifier l'algorithme et les coefficients de classement", async () => {
      const res = await request(app)
        .put(`/tournois/${tournoiId}`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({
          algorithmeClassement: "POINTS_PONDERES_FAUTES_CONTRES",
          coefficientLissage: 5,
          coefficientMalusFautes: 1,
          coefficientBoostContres: 0.8,
        });
      expect(res.status).toBe(200);
      expect(res.body.data.algorithmeClassement).toBe("POINTS_PONDERES_FAUTES_CONTRES");
      expect(res.body.data.coefficientLissage).toBe(5);
    });

    it("ADMIN, dateFin avant dateDebut existante -> 400 (une seule date envoyee)", async () => {
      const res = await request(app)
        .put(`/tournois/${tournoiId}`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ dateFin: "2020-01-01" }); // largement avant le dateDebut deja en base (2027-06-01)
      expect(res.status).toBe(400);
    });
  });

  describe("PUT /tournois/:id/annuler", () => {
    it("pas ADMIN -> 403", async () => {
      const res = await request(app).put(`/tournois/${tournoiId}/annuler`).set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(403);
    });

    it("ADMIN -> 200, statut ANNULE", async () => {
      const res = await request(app).put(`/tournois/${tournoiId}/annuler`).set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(res.status).toBe(200);
      expect(res.body.data.statut).toBe("ANNULE");
    });

    it("proprietaire ne voit PLUS le tournoi annule -> 404", async () => {
      const res = await request(app).get(`/tournois/${tournoiId}`).set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(404);
    });

    it("proprietaire ne peut PLUS le modifier -> 404", async () => {
      const res = await request(app)
        .put(`/tournois/${tournoiId}`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ nom: "Tentative" });
      expect(res.status).toBe(404);
    });

    it("le tournoi annule disparait de mes-tournois", async () => {
      const res = await request(app).get("/tournois/mes-tournois").set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.body.data.some((t: any) => t.id === tournoiId)).toBe(false);
    });

    it("ADMIN, lui, le voit toujours", async () => {
      const res = await request(app).get(`/tournois/${tournoiId}`).set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(res.status).toBe(200);
      expect(res.body.data.statut).toBe("ANNULE");
    });
  });

  describe("PUT /tournois/:id/reactiver", () => {
    it("pas ADMIN -> 403", async () => {
      const res = await request(app).put(`/tournois/${tournoiId}/reactiver`).set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(res.status).toBe(403);
    });

    it("ADMIN -> 200, le proprietaire le revoit immediatement", async () => {
      const res = await request(app).put(`/tournois/${tournoiId}/reactiver`).set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(res.status).toBe(200);
      expect(res.body.data.statut).not.toBe("ANNULE");

      const vueOrga = await request(app).get(`/tournois/${tournoiId}`).set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(vueOrga.status).toBe(200);

      const mesTournois = await request(app).get("/tournois/mes-tournois").set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(mesTournois.body.data.some((t: any) => t.id === tournoiId)).toBe(true);
    });
  });
});
