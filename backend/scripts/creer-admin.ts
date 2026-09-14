// ================================================
// CREER ADMIN — script SERVEUR, lance a la main dans un terminal :
//
//   npx ts-node scripts/creer-admin.ts
//
// Seul moyen de creer un compte ADMIN : aucune route HTTP ne le permet
// (les routes /comptes creent seulement organisateurs et joueurs). En
// production la base demarre vide, c'est donc la toute premiere
// commande a lancer apres `prisma migrate deploy`.
//
// Cree le compte ET son code secret d'un coup : un admin sans code ne
// pourrait faire aucune action protegee.
// ================================================
import "dotenv/config";
import bcrypt from "bcrypt";
import { z } from "zod";
import prisma from "../src/utils/prisma";
import { arreter, exigerTerminal, demander, demanderSecretConfirme } from "./saisie";

// Memes limites que les colonnes de la table User (schema.prisma).
const emailSchema = z.email().max(30);
const nomSchema = z.string().min(1).max(100);

async function main() {
  exigerTerminal();

  const email = (await demander("Email de connexion    : ")).toLowerCase();
  if (!emailSchema.safeParse(email).success) {
    arreter("Email invalide (30 caracteres maximum)");
  }
  if (await prisma.user.findUnique({ where: { email } })) {
    arreter(`Un compte existe deja avec l'email ${email}`);
  }

  const nom = await demander("Nom                   : ");
  const prenom = await demander("Prenom                : ");
  if (!nomSchema.safeParse(nom).success || !nomSchema.safeParse(prenom).success) {
    arreter("Nom et prenom obligatoires (100 caracteres maximum)");
  }

  console.log("\nMot de passe de connexion (12 caracteres minimum) :");
  const motDePasse = await demanderSecretConfirme("Mot de passe");

  console.log("\nCode secret admin, DIFFERENT du mot de passe (12 caracteres minimum) :");
  const code = await demanderSecretConfirme("Code secret");
  if (code === motDePasse) {
    arreter("Le code secret doit etre different du mot de passe, aucun compte cree");
  }

  const [hashMotDePasse, hashCode] = await Promise.all([
    bcrypt.hash(motDePasse, 12),
    bcrypt.hash(code, 12),
  ]);

  // Un seul create : soit le compte existe avec son code, soit rien.
  await prisma.user.create({
    data: {
      email,
      motDePasse: hashMotDePasse,
      codeSecretAdmin: hashCode,
      role: "ADMIN",
      nom,
      prenom,
      // L'admin vient de choisir son mot de passe lui-meme : pas de
      // changement force au premier login (contrairement aux comptes
      // crees avec un mot de passe par defaut).
      mustChangePassword: false,
    },
  });

  console.log(`\n✔ Compte ADMIN cree : ${email} (mot de passe et code hashes)`);
}

main()
  .catch((err) => {
    console.error("✖ Erreur :", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
