/*
  Warnings:

  - A unique constraint covering the columns `[tournoiId,joueurId]` on the table `EquipeJoueur` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tournoiId` to the `EquipeJoueur` table without a default value. This is not possible if the table is not empty.
  - Added the required column `equipesMax` to the `Tournoi` table without a default value. This is not possible if the table is not empty.
  - Added the required column `licencesMax` to the `Tournoi` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "EquipeJoueur_equipeId_joueurId_key";

-- AlterTable
ALTER TABLE "EquipeJoueur" ADD COLUMN     "tournoiId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Tournoi" ADD COLUMN     "equipesMax" INTEGER NOT NULL,
ADD COLUMN     "licencesMax" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "TournoiJoueur" (
    "id" SERIAL NOT NULL,
    "tournoiId" INTEGER NOT NULL,
    "joueurId" INTEGER NOT NULL,
    "assigneLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournoiJoueur_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TournoiJoueur_tournoiId_joueurId_key" ON "TournoiJoueur"("tournoiId", "joueurId");

-- CreateIndex
CREATE UNIQUE INDEX "EquipeJoueur_tournoiId_joueurId_key" ON "EquipeJoueur"("tournoiId", "joueurId");

-- AddForeignKey
ALTER TABLE "TournoiJoueur" ADD CONSTRAINT "TournoiJoueur_tournoiId_fkey" FOREIGN KEY ("tournoiId") REFERENCES "Tournoi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournoiJoueur" ADD CONSTRAINT "TournoiJoueur_joueurId_fkey" FOREIGN KEY ("joueurId") REFERENCES "Joueur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
