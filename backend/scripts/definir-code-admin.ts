// ================================================
// DEFINIR CODE ADMIN — script SERVEUR, lance a la main dans un terminal :
//
//   npx ts-node scripts/definir-code-admin.ts
//
// Pourquoi un script et pas une route HTTP : une route "definir mon
// code" permettrait a quelqu'un qui a vole la session admin de poser
// SON code, puis de faire toutes les actions protegees. Ici il faut un
// acces au serveur (SSH), pas juste un cookie.
//
// Relancer le script REMPLACE le code existant (rotation / code oublie).
// Refuse de tourner hors terminal : pas de `echo code | script`, qui
// laisserait le code dans l'historique du shell.
// ================================================
import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "../src/utils/prisma";
import {
  CODE_ADMIN_LONGUEUR_MIN,
  CODE_ADMIN_LONGUEUR_MAX,
} from "../src/utils/validation/compteValidator";

// Saisie visible (email).
function demander(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.once("data", (donnees: string) => {
      process.stdin.pause();
      resolve(donnees.trim());
    });
  });
}

// Saisie masquee (code) : mode raw, chaque caractere affiche "*".
function demanderMasque(question: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let saisie = "";
    const surFrappe = (morceau: string) => {
      // Un collage arrive en un seul morceau : on traite caractere par caractere.
      for (const c of morceau) {
        if (c === "\r" || c === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", surFrappe);
          process.stdout.write("\n");
          resolve(saisie);
          return;
        }
        if (c === "\u0003") {
          // Ctrl+C
          stdin.setRawMode(false);
          process.stdout.write("\nAnnule.\n");
          process.exit(130);
        }
        if (c === "\u007f" || c === "\b") {
          if (saisie.length > 0) {
            saisie = saisie.slice(0, -1);
            process.stdout.write("\b \b");
          }
          continue;
        }
        saisie += c;
        process.stdout.write("*");
      }
    };
    stdin.on("data", surFrappe);
  });
}

async function main() {
  if (!process.stdin.isTTY) {
    console.error("✖ Ce script doit etre lance dans un terminal interactif.");
    process.exit(1);
  }

  const email = await demander("Email de l'admin : ");
  const admin = await prisma.user.findUnique({ where: { email } });
  // Pas de distinction "inexistant" / "pas admin" utile a cacher ici :
  // celui qui lance le script a deja la main sur le serveur.
  if (!admin) {
    console.error(`✖ Aucun compte avec l'email ${email}`);
    process.exit(1);
  }
  if (admin.role !== "ADMIN") {
    console.error(`✖ ${email} n'est pas un compte ADMIN (role : ${admin.role})`);
    process.exit(1);
  }

  const code = await demanderMasque("Nouveau code secret : ");
  if (code.length < CODE_ADMIN_LONGUEUR_MIN || code.length > CODE_ADMIN_LONGUEUR_MAX) {
    console.error(
      `✖ Le code doit faire entre ${CODE_ADMIN_LONGUEUR_MIN} et ${CODE_ADMIN_LONGUEUR_MAX} caracteres`
    );
    process.exit(1);
  }
  if (code !== code.trim()) {
    console.error("✖ Le code ne doit pas commencer ni finir par un espace");
    process.exit(1);
  }

  const confirmation = await demanderMasque("Confirme le code    : ");
  if (confirmation !== code) {
    console.error("✖ Les deux saisies ne correspondent pas, rien n'a ete modifie");
    process.exit(1);
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
