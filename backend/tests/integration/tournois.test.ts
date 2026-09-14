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
const EMAIL_ORGA3 = "test9204@koko.bj";
const EMAIL_ORGA4 = "test9205@koko.bj"; // desactive
const EMAIL_JOUEUR = "test9206@koko.bj";
const MOT_DE_PASSE = "TestSuite123!";
const CODE_ADMIN = "Code-Secret-Tournois-1";

describe("Tournois", () => {
  let adminId: number;
  let orga1Id: number;
  let orga2Id: number;
  let orga3Id: number;
  let orga4Id: number;
  let joueurUserId: number;
  let cookiesAdmin: string[];
  let cookiesOrga3: string[];
  let cookiesOrga1: string[];
  let cookiesOrga2: string[];
  let tournoiId: number;
  const idsTournoisCrees: number[] = [];

  beforeAll(async () => {
    const hash = await bcrypt.hash(MOT_DE_PASSE, 10);

    const admin = await prisma.user.create({
      data: {
        email: EMAIL_ADMIN, motDePasse: hash, role: "ADMIN", nom: "S", prenom: "Admin",
        codeSecretAdmin: await bcrypt.hash(CODE_ADMIN, 10),
      },
    });
    adminId = admin.id;

    const orga1 = await prisma.user.create({
      data: { email: EMAIL_ORGA1, motDePasse: hash, role: "ORGANISATEUR", nom: "S", prenom: "Orga1" },
    });
    orga1Id = orga1.id;

    const orga2 = await prisma.user.create({
      data: { email: EMAIL_ORGA2, motDePasse: hash, role: "ORGANISATEUR", nom: "S", prenom: "Orga2" },
    });
    orga2Id = orga2.id;

    const orga3 = await prisma.user.create({
      data: { email: EMAIL_ORGA3, motDePasse: hash, role: "ORGANISATEUR", nom: "S", prenom: "Orga3" },
    });
    orga3Id = orga3.id;

    const orga4 = await prisma.user.create({
      data: { email: EMAIL_ORGA4, motDePasse: hash, role: "ORGANISATEUR", nom: "S", prenom: "Orga4", actif: false },
    });
    orga4Id = orga4.id;

    const joueurUser = await prisma.user.create({
      data: { email: EMAIL_JOUEUR, motDePasse: hash, role: "JOUEUR", nom: "S", prenom: "Joueur" },
    });
    joueurUserId = joueurUser.id;

    cookiesAdmin = (await request(app).post("/auth/login").send({ email: EMAIL_ADMIN, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
    cookiesOrga1 = (await request(app).post("/auth/login").send({ email: EMAIL_ORGA1, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
    cookiesOrga2 = (await request(app).post("/auth/login").send({ email: EMAIL_ORGA2, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
    cookiesOrga3 = (await request(app).post("/auth/login").send({ email: EMAIL_ORGA3, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
  });

  afterAll(async () => {
    const idsUsers = [adminId, orga1Id, orga2Id, orga3Id, orga4Id, joueurUserId];
    await prisma.match.deleteMany({ where: { tournoiId: { in: idsTournoisCrees } } });
    await prisma.tournoiJoueur.deleteMany({ where: { tournoiId: { in: idsTournoisCrees } } });
    await prisma.equipe.deleteMany({ where: { tournoiId: { in: idsTournoisCrees } } });
    await prisma.tournoi.deleteMany({ where: { id: { in: idsTournoisCrees } } });
    await prisma.joueur.deleteMany({ where: { userId: { in: idsUsers } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: idsUsers } } });
    await prisma.user.deleteMany({ where: { id: { in: idsUsers } } });
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

  // Un tournoi fini peut etre prolonge par l'ADMIN (ex: report) : le
  // statut n'etant jamais stocke, il redevient en cours tout seul, pour
  // l'organisateur comme pour tout le monde.
  describe("Prolongation d'un tournoi TERMINE par l'ADMIN", () => {
    let tournoiFiniId: number;

    it("tournoi aux dates passees -> TERMINE chez l'organisateur", async () => {
      const creation = await request(app)
        .post("/tournois")
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({
          nom: "Tournoi Fini",
          lieu: "Porto-Novo",
          dateDebut: "2020-01-01",
          dateFin: "2020-01-10",
          organisateurId: orga2Id,
          licencesMax: 10,
          equipesMax: 4,
        });
      expect(creation.status).toBe(201);
      tournoiFiniId = creation.body.data.id;
      idsTournoisCrees.push(tournoiFiniId);

      const mesTournois = await request(app).get("/tournois/mes-tournois").set("Cookie", cookieValue(cookiesOrga2, "accessToken"));
      expect(mesTournois.body.data.find((t: any) => t.id === tournoiFiniId).statut).toBe("TERMINE");
    });

    it("ADMIN repousse la date de fin -> redevient ACTIF chez l'organisateur", async () => {
      const res = await request(app)
        .put(`/tournois/${tournoiFiniId}`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ dateFin: "2099-12-31" });
      expect(res.status).toBe(200);
      expect(res.body.data.statut).toBe("ACTIF");

      const mesTournois = await request(app).get("/tournois/mes-tournois").set("Cookie", cookieValue(cookiesOrga2, "accessToken"));
      expect(mesTournois.body.data.find((t: any) => t.id === tournoiFiniId).statut).toBe("ACTIF");
    });
  });
  describe("GET /tournois/mes-tournois — compteurs de l'accueil organisateur", () => {
    it("equipes, joueurs du pool, scoresASaisir = matchs EN_RETARD seulement", async () => {
      const tournoi = await prisma.tournoi.create({
        data: {
          nom: "Tournoi Compteurs", lieu: "Parakou",
          dateDebut: new Date("2020-02-01"), dateFin: new Date("2020-02-05"),
          organisateurId: orga2Id, licencesMax: 10, equipesMax: 10,
        },
      });
      idsTournoisCrees.push(tournoi.id);

      const [e1, e2, e3] = await Promise.all(
        ["Un", "Deux", "Trois"].map((nom) =>
          prisma.equipe.create({ data: { nom, couleur: "#123456", tournoiId: tournoi.id } })
        )
      );
      const joueur = await prisma.joueur.create({
        data: { dateNaissance: new Date("2000-01-01"), idKoko: "KOKO-2026-9206", nomLegal: "S", prenom: "Joueur", userId: joueurUserId },
      });
      await prisma.tournoiJoueur.create({ data: { tournoiId: tournoi.id, joueurId: joueur.id } });

      const passe = new Date("2020-02-02T18:00:00Z");
      const futur = new Date("2099-02-02T18:00:00Z");
      const base = { tournoiId: tournoi.id, equipe1Id: e1.id, equipe2Id: e2.id, lieu: "Salle", type: "Poule" };
      await prisma.match.createMany({
        data: [
          { ...base, date: passe },                          // EN_RETARD -> a saisir
          { ...base, date: passe, equipe2Id: e3.id },        // EN_RETARD -> a saisir
          { ...base, date: passe, score1: 50, score2: 40 },  // TERMINE
          { ...base, date: futur },                          // A_VENIR
          { ...base, date: passe, statut: "ANNULE" },        // ANNULE
          { ...base, date: passe, statut: "REPORTE" },       // REPORTE
        ],
      });

      const res = await request(app).get("/tournois/mes-tournois").set("Cookie", cookieValue(cookiesOrga2, "accessToken"));
      expect(res.status).toBe(200);
      const ligne = res.body.data.find((t: any) => t.id === tournoi.id);
      expect(ligne.compteurs).toEqual({ equipes: 3, joueurs: 1, scoresASaisir: 2 });
      // Les donnees brutes servant au calcul ne fuient pas dans la reponse.
      expect(ligne._count).toBeUndefined();
      expect(ligne.matchs).toBeUndefined();

      // Memes compteurs cote ADMIN, dans GET /tournois (dashboard admin).
      const vueAdmin = await request(app).get("/tournois").set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(vueAdmin.status).toBe(200);
      const ligneAdmin = vueAdmin.body.data.find((t: any) => t.id === tournoi.id);
      expect(ligneAdmin.compteurs).toEqual({ equipes: 3, joueurs: 1, scoresASaisir: 2 });
      expect(ligneAdmin.organisateur.id).toBe(orga2Id);
      expect(ligneAdmin._count).toBeUndefined();
    });
  });

  // Scenario : A a le tournoi T, on le donne a B. A perd l'acces et
  // redevient libre sur la periode ; B ne peut pas recevoir un second
  // tournoi sur les memes dates.
  describe("PUT /tournois/:id/organisateur — reattribution (code secret admin)", () => {
    it("sans code -> 403, le tournoi reste a orga1", async () => {
      const res = await request(app)
        .put(`/tournois/${tournoiId}/organisateur`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ organisateurId: orga3Id });
      expect(res.status).toBe(403);
      const enBase = await prisma.tournoi.findUnique({ where: { id: tournoiId } });
      expect(enBase?.organisateurId).toBe(orga1Id);
    });

    it("un organisateur, meme avec le code -> 403 (route ADMIN)", async () => {
      const res = await request(app)
        .put(`/tournois/${tournoiId}/organisateur`)
        .set("Cookie", cookieValue(cookiesOrga1, "accessToken"))
        .send({ organisateurId: orga3Id, codeAdmin: CODE_ADMIN });
      expect(res.status).toBe(403);
    });

    it("vers un compte qui n'est pas organisateur -> 400", async () => {
      const res = await request(app)
        .put(`/tournois/${tournoiId}/organisateur`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ organisateurId: adminId, codeAdmin: CODE_ADMIN });
      expect(res.status).toBe(400);
    });

    it("vers un organisateur desactive -> 400", async () => {
      const res = await request(app)
        .put(`/tournois/${tournoiId}/organisateur`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ organisateurId: orga4Id, codeAdmin: CODE_ADMIN });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Cet organisateur est desactive");
    });

    it("vers le meme organisateur -> 400", async () => {
      const res = await request(app)
        .put(`/tournois/${tournoiId}/organisateur`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ organisateurId: orga1Id, codeAdmin: CODE_ADMIN });
      expect(res.status).toBe(400);
    });

    it("vers orga3 avec le code -> 200", async () => {
      const res = await request(app)
        .put(`/tournois/${tournoiId}/organisateur`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ organisateurId: orga3Id, codeAdmin: CODE_ADMIN });
      expect(res.status).toBe(200);
      expect(res.body.data.organisateurId).toBe(orga3Id);
    });

    it("orga1 perd l'acces immediatement (404), orga3 l'obtient", async () => {
      const vueOrga1 = await request(app).get(`/tournois/${tournoiId}`).set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(vueOrga1.status).toBe(404);
      const listeOrga1 = await request(app).get("/tournois/mes-tournois").set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
      expect(listeOrga1.body.data.some((t: any) => t.id === tournoiId)).toBe(false);

      const vueOrga3 = await request(app).get(`/tournois/${tournoiId}`).set("Cookie", cookieValue(cookiesOrga3, "accessToken"));
      expect(vueOrga3.status).toBe(200);
      const listeOrga3 = await request(app).get("/tournois/mes-tournois").set("Cookie", cookieValue(cookiesOrga3, "accessToken"));
      expect(listeOrga3.body.data.some((t: any) => t.id === tournoiId)).toBe(true);
    });

    let tournoiLibreOrga1Id: number;

    it("orga1 est libre : nouveau tournoi sur les MEMES dates -> 201", async () => {
      const res = await request(app)
        .post("/tournois")
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({
          nom: "Tournoi Apres Reattribution", lieu: "Cotonou",
          dateDebut: "2027-06-01", dateFin: "2027-06-20",
          organisateurId: orga1Id, licencesMax: 10, equipesMax: 4,
        });
      expect(res.status).toBe(201);
      tournoiLibreOrga1Id = res.body.data.id;
      idsTournoisCrees.push(tournoiLibreOrga1Id);
    });

    it("donner ce tournoi a orga3, qui a deja un tournoi sur ces dates -> 400", async () => {
      const res = await request(app)
        .put(`/tournois/${tournoiLibreOrga1Id}/organisateur`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ organisateurId: orga3Id, codeAdmin: CODE_ADMIN });
      expect(res.status).toBe(400);
      const enBase = await prisma.tournoi.findUnique({ where: { id: tournoiLibreOrga1Id } });
      expect(enBase?.organisateurId).toBe(orga1Id);
    });
  });

  // orga1 a maintenant un seul tournoi actif : 2027-06-01 -> 2027-06-20.
  describe("Chevauchement a la modification et a la reactivation", () => {
    let tournoiJuilletId: number;

    it("ADMIN deplace un tournoi sur la periode d'un autre du meme organisateur -> 400", async () => {
      const creation = await request(app)
        .post("/tournois")
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({
          nom: "Tournoi Juillet", lieu: "Cotonou",
          dateDebut: "2027-07-01", dateFin: "2027-07-10",
          organisateurId: orga1Id, licencesMax: 10, equipesMax: 4,
        });
      expect(creation.status).toBe(201);
      tournoiJuilletId = creation.body.data.id;
      idsTournoisCrees.push(tournoiJuilletId);

      const res = await request(app)
        .put(`/tournois/${tournoiJuilletId}`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ dateDebut: "2027-06-15" });
      expect(res.status).toBe(400);
      const enBase = await prisma.tournoi.findUnique({ where: { id: tournoiJuilletId } });
      expect(enBase!.dateDebut.toISOString().slice(0, 10)).toBe("2027-07-01");
    });

    it("prolonger sans toucher un autre tournoi -> 200 (il ne se bloque pas lui-meme)", async () => {
      const res = await request(app)
        .put(`/tournois/${tournoiJuilletId}`)
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({ dateFin: "2027-07-20" });
      expect(res.status).toBe(200);
    });

    it("reactiver un tournoi dont la periode a ete reprise pendant l'annulation -> 400", async () => {
      const annulation = await request(app).put(`/tournois/${tournoiJuilletId}/annuler`).set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(annulation.status).toBe(200);

      // Le tournoi annule ne bloque pas : la periode est reprise.
      const remplacant = await request(app)
        .post("/tournois")
        .set("Cookie", cookieValue(cookiesAdmin, "accessToken"))
        .send({
          nom: "Tournoi Remplacant", lieu: "Cotonou",
          dateDebut: "2027-07-05", dateFin: "2027-07-08",
          organisateurId: orga1Id, licencesMax: 10, equipesMax: 4,
        });
      expect(remplacant.status).toBe(201);
      idsTournoisCrees.push(remplacant.body.data.id);

      const reactivation = await request(app).put(`/tournois/${tournoiJuilletId}/reactiver`).set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
      expect(reactivation.status).toBe(400);
      const enBase = await prisma.tournoi.findUnique({ where: { id: tournoiJuilletId } });
      expect(enBase?.statut).toBe("ANNULE");
    });
  });
});
