// ================================================
// TESTS D'INTEGRATION — acces au classement (ADMIN/ORGANISATEUR/JOUEUR)
// ================================================
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../src/app";
import prisma from "../../src/utils/prisma";
import { cookieValue } from "../helpers";

const EMAIL_ADMIN = "test9601@koko.bj";
const EMAIL_ORGA1 = "test9602@koko.bj";
const EMAIL_ORGA2 = "test9603@koko.bj";
const EMAIL_J1 = "test9604@koko.bj";
const EMAIL_J2 = "test9605@koko.bj";
const MOT_DE_PASSE = "TestSuite123!";

describe("Acces au classement", () => {
  let adminId: number;
  let orga1Id: number;
  let orga2Id: number;
  let cookiesAdmin: string[];
  let cookiesOrga1: string[];
  let cookiesJ1: string[];
  let cookiesJ2: string[];

  let tournoi1Id: number; // orga1, joueur1 dans le pool
  let tournoiAutreId: number; // orga2, joueur1 PAS dans le pool
  let tournoiAnnuleId: number; // orga1, ANNULE, joueur1 dans le pool quand meme

  let joueur1Id: number;

  const userIds: number[] = [];
  const joueurIds: number[] = [];
  const tournoiIds: number[] = [];

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
    const joueur1 = await prisma.joueur.create({ data: { idKoko: "KOKO-2026-6111", nomLegal: "Joueur", prenom: "J1", userId: userJ1.id } });
    joueur1Id = joueur1.id;
    joueurIds.push(joueur1Id);

    const userJ2 = await prisma.user.create({
      data: { email: EMAIL_J2, motDePasse: hash, role: "JOUEUR", nom: "Joueur", prenom: "J2" },
    });
    userIds.push(userJ2.id);
    const joueur2 = await prisma.joueur.create({ data: { idKoko: "KOKO-2026-6222", nomLegal: "Joueur", prenom: "J2", userId: userJ2.id } });
    joueurIds.push(joueur2.id);

    const tournoi1 = await prisma.tournoi.create({
      data: {
        nom: "Tournoi Acces Classement", lieu: "Cotonou",
        dateDebut: new Date("2027-08-01"), dateFin: new Date("2027-08-10"),
        organisateurId: orga1Id, licencesMax: 5, equipesMax: 5,
      },
    });
    tournoi1Id = tournoi1.id;
    tournoiIds.push(tournoi1Id);

    const tournoiAutre = await prisma.tournoi.create({
      data: {
        nom: "Tournoi Autre Orga", lieu: "Cotonou",
        dateDebut: new Date("2027-08-01"), dateFin: new Date("2027-08-10"),
        organisateurId: orga2Id, licencesMax: 5, equipesMax: 5,
      },
    });
    tournoiAutreId = tournoiAutre.id;
    tournoiIds.push(tournoiAutreId);

    const tournoiAnnule = await prisma.tournoi.create({
      data: {
        nom: "Tournoi Annule Classement", lieu: "Cotonou",
        dateDebut: new Date("2027-08-01"), dateFin: new Date("2027-08-10"),
        organisateurId: orga1Id, licencesMax: 5, equipesMax: 5, statut: "ANNULE",
      },
    });
    tournoiAnnuleId = tournoiAnnule.id;
    tournoiIds.push(tournoiAnnuleId);

    // joueur1 est dans le pool de tournoi1 ET de tournoiAnnule, mais PAS
    // de tournoiAutre.
    await prisma.tournoiJoueur.createMany({
      data: [
        { tournoiId: tournoi1Id, joueurId: joueur1Id },
        { tournoiId: tournoiAnnuleId, joueurId: joueur1Id },
      ],
    });

    cookiesAdmin = (await request(app).post("/auth/login").send({ email: EMAIL_ADMIN, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
    cookiesOrga1 = (await request(app).post("/auth/login").send({ email: EMAIL_ORGA1, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
    cookiesJ1 = (await request(app).post("/auth/login").send({ email: EMAIL_J1, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
    cookiesJ2 = (await request(app).post("/auth/login").send({ email: EMAIL_J2, motDePasse: MOT_DE_PASSE })).headers["set-cookie"] as unknown as string[];
  });

  afterAll(async () => {
    await prisma.tournoiJoueur.deleteMany({ where: { tournoiId: { in: tournoiIds } } });
    await prisma.tournoi.deleteMany({ where: { id: { in: tournoiIds } } });
    await prisma.joueur.deleteMany({ where: { id: { in: joueurIds } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("joueur1 (dans le pool) -> 200 sur le classement joueurs", async () => {
    const res = await request(app)
      .get(`/tournois/${tournoi1Id}/classement`)
      .set("Cookie", cookieValue(cookiesJ1, "accessToken"));
    expect(res.status).toBe(200);
  });

  it("joueur1 (dans le pool) -> 200 sur le classement equipes", async () => {
    const res = await request(app)
      .get(`/tournois/${tournoi1Id}/classement-equipes`)
      .set("Cookie", cookieValue(cookiesJ1, "accessToken"));
    expect(res.status).toBe(200);
  });

  it("joueur2 (PAS dans le pool) -> 404", async () => {
    const res = await request(app)
      .get(`/tournois/${tournoi1Id}/classement`)
      .set("Cookie", cookieValue(cookiesJ2, "accessToken"));
    expect(res.status).toBe(404);
  });

  it("joueur1 sur un tournoi auquel il n'appartient pas -> 404 (pas d'enumeration)", async () => {
    const res = await request(app)
      .get(`/tournois/${tournoiAutreId}/classement`)
      .set("Cookie", cookieValue(cookiesJ1, "accessToken"));
    expect(res.status).toBe(404);
  });

  it("joueur1, meme dans le pool, sur un tournoi ANNULE -> 404", async () => {
    const res = await request(app)
      .get(`/tournois/${tournoiAnnuleId}/classement`)
      .set("Cookie", cookieValue(cookiesJ1, "accessToken"));
    expect(res.status).toBe(404);
  });

  it("ADMIN -> 200 meme sur le tournoi ANNULE", async () => {
    const res = await request(app)
      .get(`/tournois/${tournoiAnnuleId}/classement`)
      .set("Cookie", cookieValue(cookiesAdmin, "accessToken"));
    expect(res.status).toBe(200);
  });

  it("organisateur proprietaire -> toujours 200 (non-regression)", async () => {
    const res = await request(app)
      .get(`/tournois/${tournoi1Id}/classement`)
      .set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
    expect(res.status).toBe(200);
  });

  it("organisateur PAS proprietaire -> 404", async () => {
    const res = await request(app)
      .get(`/tournois/${tournoiAutreId}/classement`)
      .set("Cookie", cookieValue(cookiesOrga1, "accessToken"));
    expect(res.status).toBe(404);
  });
});
