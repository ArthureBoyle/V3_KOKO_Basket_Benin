// ================================================
// DEFINIR CODE ADMIN — script SERVEUR, lance a la main dans un terminal :
//
//   npx ts-node scripts/definir-code-admin.ts
//
// Pour un admin qui EXISTE deja (sinon : scripts/creer-admin.ts, qui
// cree le compte et son code d'un coup).
//
// Pourquoi un script et pas une route HTTP : une route "definir mon
// code" permettrait a quelqu'un qui a vole la session admin de poser
// SON code, puis de faire toutes les actions protegees. Ici il faut un
// acces au serveur (SSH), pas juste un cookie.
//
// Relancer le script REMPLACE le code existant (rotation / code oublie).
// ================================================
import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "../src/utils/prisma";
import { arreter, exigerTerminal, demander, demanderSecretConfirme } from "./saisie";

async function main() {
  exigerTerminal();

  const email = (await demander("Email de l'admin      : ")).toLowerCase();
  const admin = await prisma.user.findUnique({ where: { email } });
  // Messages precis volontairement : celui qui lance le script a deja
  // la main sur le serveur, il n'y a rien a lui cacher.
  if (!admin) {
    arreter(`Aucun compte avec l'email ${email} (pour en creer un : scripts/creer-admin.ts)`);
  }
  if (admin.role !== "ADMIN") {
    arreter(`${email} n'est pas un compte ADMIN (role : ${admin.role})`);
  }

  const code = await demanderSecretConfirme("Nouveau code secret");

  if (await bcrypt.compare(code, admin.motDePasse)) {
    arreter("Le code secret doit etre different du mot de passe, rien n'a ete modifie");
  }

  const dejaDefini = admin.codeSecretAdmin !== null;
  const hash = await bcrypt.hash(code, 12);
  await prisma.user.update({ where: { id: admin.id }, data: { codeSecretAdmin: hash } });

  console.log(`✔ Code ${dejaDefini ? "remplace" : "enregistre"} (hashe) pour ${email}`);
}

main()
  .catch((err) => {
    console.error("✖ Erreur :", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
