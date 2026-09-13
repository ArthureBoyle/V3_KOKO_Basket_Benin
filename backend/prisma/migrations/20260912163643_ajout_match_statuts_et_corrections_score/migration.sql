/*
  Warnings:

  - The values [EN_COURS] on the enum `StatutMatch` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StatutMatch_new" AS ENUM ('A_VENIR', 'EN_RETARD', 'REPORTE', 'TERMINE', 'ANNULE');
ALTER TABLE "public"."Match" ALTER COLUMN "statut" DROP DEFAULT;
ALTER TABLE "Match" ALTER COLUMN "statut" TYPE "StatutMatch_new" USING ("statut"::text::"StatutMatch_new");
ALTER TYPE "StatutMatch" RENAME TO "StatutMatch_old";
ALTER TYPE "StatutMatch_new" RENAME TO "StatutMatch";
DROP TYPE "public"."StatutMatch_old";
ALTER TABLE "Match" ALTER COLUMN "statut" SET DEFAULT 'A_VENIR';
COMMIT;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "nombreCorrectionsScore" INTEGER NOT NULL DEFAULT 0;
