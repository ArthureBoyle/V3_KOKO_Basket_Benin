-- CreateEnum
CREATE TYPE "RoleUtilisateur" AS ENUM ('ADMIN', 'ORGANISATEUR', 'JOUEUR');

-- CreateEnum
CREATE TYPE "StatutTournoi" AS ENUM ('A_VENIR', 'ACTIF', 'TERMINE');

-- CreateEnum
CREATE TYPE "StatutMatch" AS ENUM ('A_VENIR', 'EN_COURS', 'EN_RETARD', 'REPORTE', 'TERMINE', 'ANNULE');

-- CreateEnum
CREATE TYPE "StatutCertification" AS ENUM ('EN_ATTENTE', 'CERTIFIE', 'SUSPENDU');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(30) NOT NULL,
    "motDePasse" VARCHAR(60) NOT NULL,
    "role" "RoleUtilisateur" NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "emailReel" VARCHAR(254),
    "nom" VARCHAR(100) NOT NULL,
    "prenom" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Joueur" (
    "id" SERIAL NOT NULL,
    "idKoko" VARCHAR(20) NOT NULL,
    "nomLegal" VARCHAR(100) NOT NULL,
    "prenom" VARCHAR(100) NOT NULL,
    "surnom" VARCHAR(50),
    "dateNaissance" DATE,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Joueur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournoi" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(150) NOT NULL,
    "lieu" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "dateDebut" DATE NOT NULL,
    "dateFin" DATE NOT NULL,
    "statut" "StatutTournoi" NOT NULL DEFAULT 'A_VENIR',
    "organisateurId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tournoi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipe" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "couleur" VARCHAR(7) NOT NULL,
    "logo" TEXT,
    "tournoiId" INTEGER NOT NULL,

    CONSTRAINT "Equipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipeJoueur" (
    "id" SERIAL NOT NULL,
    "equipeId" INTEGER NOT NULL,
    "joueurId" INTEGER NOT NULL,
    "numeroDeMaillot" INTEGER NOT NULL,
    "statut" "StatutCertification" NOT NULL DEFAULT 'EN_ATTENTE',

    CONSTRAINT "EquipeJoueur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" SERIAL NOT NULL,
    "tournoiId" INTEGER NOT NULL,
    "equipe1Id" INTEGER NOT NULL,
    "equipe2Id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dateOriginale" TIMESTAMP(3),
    "lieu" VARCHAR(150) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "statut" "StatutMatch" NOT NULL DEFAULT 'A_VENIR',
    "score1" INTEGER,
    "score2" INTEGER,
    "arbitre" VARCHAR(100),

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stat" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "joueurId" INTEGER NOT NULL,
    "equipeId" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "fautes" INTEGER NOT NULL DEFAULT 0,
    "tempsJeu" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Stat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Joueur_idKoko_key" ON "Joueur"("idKoko");

-- CreateIndex
CREATE UNIQUE INDEX "Joueur_userId_key" ON "Joueur"("userId");

-- CreateIndex
CREATE INDEX "Equipe_tournoiId_idx" ON "Equipe"("tournoiId");

-- CreateIndex
CREATE UNIQUE INDEX "EquipeJoueur_equipeId_joueurId_key" ON "EquipeJoueur"("equipeId", "joueurId");

-- CreateIndex
CREATE UNIQUE INDEX "EquipeJoueur_equipeId_numeroDeMaillot_key" ON "EquipeJoueur"("equipeId", "numeroDeMaillot");

-- CreateIndex
CREATE INDEX "Match_tournoiId_idx" ON "Match"("tournoiId");

-- CreateIndex
CREATE UNIQUE INDEX "Stat_matchId_joueurId_key" ON "Stat"("matchId", "joueurId");

-- AddForeignKey
ALTER TABLE "Joueur" ADD CONSTRAINT "Joueur_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournoi" ADD CONSTRAINT "Tournoi_organisateurId_fkey" FOREIGN KEY ("organisateurId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipe" ADD CONSTRAINT "Equipe_tournoiId_fkey" FOREIGN KEY ("tournoiId") REFERENCES "Tournoi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipeJoueur" ADD CONSTRAINT "EquipeJoueur_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "Equipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipeJoueur" ADD CONSTRAINT "EquipeJoueur_joueurId_fkey" FOREIGN KEY ("joueurId") REFERENCES "Joueur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_tournoiId_fkey" FOREIGN KEY ("tournoiId") REFERENCES "Tournoi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_equipe1Id_fkey" FOREIGN KEY ("equipe1Id") REFERENCES "Equipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_equipe2Id_fkey" FOREIGN KEY ("equipe2Id") REFERENCES "Equipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stat" ADD CONSTRAINT "Stat_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stat" ADD CONSTRAINT "Stat_joueurId_fkey" FOREIGN KEY ("joueurId") REFERENCES "Joueur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stat" ADD CONSTRAINT "Stat_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "Equipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
