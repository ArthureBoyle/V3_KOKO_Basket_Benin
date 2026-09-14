// ================================================
// SAISIE — helpers terminal partages par les scripts serveur ADMIN
// (creer-admin.ts, definir-code-admin.ts). Pas un script a lancer.
// ================================================
import {
  CODE_ADMIN_LONGUEUR_MIN,
  CODE_ADMIN_LONGUEUR_MAX,
} from "../src/utils/validation/compteValidator";

export function arreter(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

// Refuse `echo secret | script` : le secret finirait dans l'historique du shell.
export function exigerTerminal() {
  if (!process.stdin.isTTY) {
    arreter("Ce script doit etre lance dans un terminal interactif.");
  }
}

// Saisie visible (email, nom...).
export function demander(question: string): Promise<string> {
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

// Saisie masquee (mot de passe, code) : mode raw, chaque caractere affiche "*".
export function demanderMasque(question: string): Promise<string> {
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

// Secret saisi deux fois, 12-72 caracteres (72 : limite de bcrypt),
// sans espace au debut ou a la fin (invisible, source d'erreurs).
export async function demanderSecretConfirme(
  libelle: string,
  longueurMin = CODE_ADMIN_LONGUEUR_MIN,
  longueurMax = CODE_ADMIN_LONGUEUR_MAX
): Promise<string> {
  const secret = await demanderMasque(`${libelle.padEnd(22)}: `);
  if (secret.length < longueurMin || secret.length > longueurMax) {
    arreter(`Doit faire entre ${longueurMin} et ${longueurMax} caracteres`);
  }
  if (secret !== secret.trim()) {
    arreter("Ne doit pas commencer ni finir par un espace");
  }
  const confirmation = await demanderMasque(`${"Confirme".padEnd(22)}: `);
  if (confirmation !== secret) {
    arreter("Les deux saisies ne correspondent pas, rien n'a ete modifie");
  }
  return secret;
}
