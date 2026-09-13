// ================================================
// SEED K6 — peuple la base de DEV (docker-compose local) avec des
// donnees realistes pour que le test de charge ait du vrai travail a
// faire (classement calcule sur plusieurs matchs/joueurs, pas une
// requete vide). Jamais lance en test automatise (Vitest) -- un script
// manuel, a executer une fois avant une session k6 :
//
//   npx ts-node k6/seed.ts
//
// Idempotent : supprime d'abord tout ce qui porte le prefixe k6- avant
// de recreer, donc relancable sans accumuler des doublons.
// ================================================
import bcrypt from "bcrypt";
import prisma from "../src/utils/prisma";

export const K6_MOT_DE_PASSE = "K6Test123!";
export const K6_EMAIL_ADMIN = "k6-admin@koko.bj";
export const K6_EMAIL_ORGA = "k6-orga@koko.bj";

async function nettoyer() {
  const users = await prisma.user.findMany({
    where: { email: { in: [K6_EMAIL_ADMIN, K6_EMAIL_ORGA] } },
  });
  const orga = users.find((u) => u.email === K6_EMAIL_ORGA);

  if (orga) {
    const tournois = await prisma.tournoi.findMany({ where: { organisateurId: orga.id } });
    const tournoiIds = tournois.map((t) => t.id);
    if (tournoiIds.length > 0) {
      await prisma.stat.deleteMany({ where: { match: { tournoiId: { in: tournoiIds } } } });
      await prisma.match.deleteMany({ where: { tournoiId: { in: tournoiIds } } });
      await prisma.equipeJoueur.deleteMany({ where: { tournoiId: { in: tournoiIds } } });
      await prisma.equipe.deleteMany({ where: { tournoiId: { in: tournoiIds } } });
      await prisma.tournoiJoueur.deleteMany({ where: { tournoiId: { in: tournoiIds } } });
      await prisma.tournoi.deleteMany({ where: { id: { in: tournoiIds } } });
    }
  }

  const joueursK6 = await prisma.joueur.findMany({ where: { idKoko: { startsWith: "K6-" } } });
  const joueurUserIds = joueursK6.map((j) => j.userId);
  await prisma.joueur.deleteMany({ where: { id: { in: joueursK6.map((j) => j.id) } } });

  const userIdsASupprimer = [...users.map((u) => u.id), ...joueurUserIds];
  await prisma.refreshToken.deleteMany({ where: { userId: { in: userIdsASupprimer } } });
  await prisma.user.deleteMany({ where: { id: { in: userIdsASupprimer } } });
}

async function seed() {
  console.log("Nettoyage des donnees k6 precedentes...");
  await nettoyer();

  console.log("Creation admin/organisateur...");
  const hash = await bcrypt.hash(K6_MOT_DE_PASSE, 10);

  const admin = await prisma.user.create({
    data: { email: K6_EMAIL_ADMIN, motDePasse: hash, role: "ADMIN", nom: "K6", prenom: "Admin", mustChangePassword: false },
  });

  const orga = await prisma.user.create({
    data: { email: K6_EMAIL_ORGA, motDePasse: hash, role: "ORGANISATEUR", nom: "K6", prenom: "Orga", mustChangePassword: false },
  });

  console.log("Creation du tournoi...");
  const tournoi = await prisma.tournoi.create({
    data: {
      nom: "Tournoi K6 (charge)",
      lieu: "Cotonou",
      dateDebut: new Date("2020-01-01"),
      dateFin: new Date("2020-01-31"),
      organisateurId: orga.id,
      licencesMax: 100,
      equipesMax: 20,
    },
  });

  console.log("Creation de 8 equipes...");
  const equipes = [];
  for (let i = 0; i < 8; i++) {
    const equipe = await prisma.equipe.create({
      data: { nom: `Equipe K6 ${i}`, couleur: "#336699", tournoiId: tournoi.id },
    });
    equipes.push(equipe);
  }

  console.log("Creation de ~40 joueurs, assignation au pool + aux equipes...");
  const joueursParEquipe: number[][] = equipes.map(() => []);
  for (let i = 0; i < 40; i++) {
    const user = await prisma.user.create({
      data: { email: `k6-joueur-${i}@koko.bj`, motDePasse: hash, role: "JOUEUR", nom: "K6", prenom: `J${i}`, mustChangePassword: false },
    });
    const joueur = await prisma.joueur.create({
      data: { idKoko: `K6-${String(i).padStart(4, "0")}`, nomLegal: "K6", prenom: `J${i}`, userId: user.id },
    });
    await prisma.tournoiJoueur.create({ data: { tournoiId: tournoi.id, joueurId: joueur.id } });

    const equipeIndex = i % equipes.length;
    const numeroDansEquipe = joueursParEquipe[equipeIndex].length;
    await prisma.equipeJoueur.create({
      data: {
        equipeId: equipes[equipeIndex].id,
        tournoiId: tournoi.id,
        joueurId: joueur.id,
        numeroDeMaillot: numeroDansEquipe + 1,
      },
    });
    joueursParEquipe[equipeIndex].push(joueur.id);
  }

  console.log("Creation de ~28 matchs TERMINE (score + stats), tous croises entre equipes...");
  let nombreMatchs = 0;
  for (let i = 0; i < equipes.length; i++) {
    for (let j = i + 1; j < equipes.length; j++) {
      const score1 = 60 + Math.floor(Math.random() * 30);
      const score2 = 60 + Math.floor(Math.random() * 30);
      const match = await prisma.match.create({
        data: {
          tournoiId: tournoi.id,
          equipe1Id: equipes[i].id,
          equipe2Id: equipes[j].id,
          date: new Date("2020-01-15T18:00:00Z"),
          lieu: "Gymnase K6",
          type: "Poule",
          score1,
          score2,
        },
      });
      nombreMatchs++;

      for (const joueurId of joueursParEquipe[i]) {
        await prisma.stat.create({
          data: {
            matchId: match.id,
            joueurId,
            equipeId: equipes[i].id,
            points: Math.floor(Math.random() * 25),
            fautes: Math.floor(Math.random() * 5),
            contres: Math.floor(Math.random() * 4),
            tempsJeu: 20 + Math.floor(Math.random() * 20),
          },
        });
      }
      for (const joueurId of joueursParEquipe[j]) {
        await prisma.stat.create({
          data: {
            matchId: match.id,
            joueurId,
            equipeId: equipes[j].id,
            points: Math.floor(Math.random() * 25),
            fautes: Math.floor(Math.random() * 5),
            contres: Math.floor(Math.random() * 4),
            tempsJeu: 20 + Math.floor(Math.random() * 20),
          },
        });
      }
    }
  }

  console.log("\n=== Seed termine ===");
  console.log(`ADMIN     : ${K6_EMAIL_ADMIN} / ${K6_MOT_DE_PASSE}`);
  console.log(`ORGA      : ${K6_EMAIL_ORGA} / ${K6_MOT_DE_PASSE}`);
  console.log(`tournoiId : ${tournoi.id}`);
  console.log(`equipes   : ${equipes.length}, matchs TERMINE : ${nombreMatchs}, joueurs : 40`);
  console.log("\nColle tournoiId dans k6/*.js (BASE_URL/TOURNOI_ID en haut du fichier).");
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
