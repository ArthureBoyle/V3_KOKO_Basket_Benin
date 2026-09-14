-- Date de naissance obligatoire pour tout joueur.
-- Aucune base de production n'existe encore : les seules lignes sans date
-- sont des donnees de dev (seed k6). On leur pose une date de dev AVANT le
-- NOT NULL, sinon PostgreSQL refuse la contrainte.
UPDATE "Joueur" SET "dateNaissance" = DATE '2000-01-01' WHERE "dateNaissance" IS NULL;

-- AlterTable
ALTER TABLE "Joueur" ALTER COLUMN "dateNaissance" SET NOT NULL;
