// ================================================
// PRISMA — instance unique, reutilisee partout
// ================================================
// Une seule instance PrismaClient pour toute l'application, pour ne pas
// ouvrir une nouvelle connexion a chaque import — exactement le role
// que ce fichier jouait deja en V2 et dans le projet de piscine.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default prisma;
