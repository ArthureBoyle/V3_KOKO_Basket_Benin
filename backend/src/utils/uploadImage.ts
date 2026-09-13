// ================================================
// UPLOAD IMAGE — multer (reception) + file-type (verifie le contenu
// REEL) + sharp (re-encode, tue les polyglottes et les bombes de
// decompression). Voir notes-apprentissage/Recap-03-securite-upload-images.md
// pour le detail de chaque menace couverte.
// ================================================
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";

const TAILLE_MAX_OCTETS = 3 * 1024 * 1024; // 3 Mo
const TYPES_AUTORISES = ["image/jpeg", "image/png", "image/webp"];
const DOSSIER_UPLOADS = path.join(__dirname, "../../uploads");

// Distincte d'une Error generique : errorHandler.ts la reconnait pour
// repondre 400 avec un message clair, au lieu du 500 generique par defaut.
export class ErreurFichierInvalide extends Error {}

// Memoire, pas disque : le fichier brut n'est JAMAIS ecrit tel quel sur
// le disque -- seule la version re-encodee par sharp l'est, plus bas.
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAILLE_MAX_OCTETS },
  fileFilter: (_req, file, cb) => {
    // Premier filtre, rapide mais PAS suffisant seul (Content-Type
    // declare par le client, facilement falsifiable) -- juste pour
    // rejeter tout de suite l'evident, la vraie verification est dans
    // traiterEtEnregistrerImage() juste apres.
    if (!TYPES_AUTORISES.includes(file.mimetype)) {
      return cb(new ErreurFichierInvalide("Format non autorise (jpeg/png/webp seulement)"));
    }
    cb(null, true);
  },
});

// Verifie le contenu REEL (magic bytes, ignore ce que le client a
// declare), re-encode via sharp (detruit tout payload cache -- fichier
// polyglotte -- et limite les dimensions d'entree -- bombe de
// decompression), puis ecrit le resultat sur disque sous un nom genere
// (jamais celui du client). Renvoie le chemin RELATIF a stocker en base.
export async function traiterEtEnregistrerImage(
  buffer: Buffer,
  sousDossier: "joueurs" | "equipes"
): Promise<string> {
  const typeReel = await fileTypeFromBuffer(buffer);
  if (!typeReel || !TYPES_AUTORISES.includes(typeReel.mime)) {
    throw new ErreurFichierInvalide("Le fichier envoye n'est pas une image valide (jpeg/png/webp)");
  }

  // sharp refuse par defaut les images depassant ~268 millions de
  // pixels avant meme de les decoder completement -- une bombe de
  // decompression n'a jamais l'occasion de se "deplier" en memoire.
  const image = sharp(buffer, { limitInputPixels: 268_402_689 });
  const buffer2 = await image
    .resize(800, 800, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const dossierCible = path.join(DOSSIER_UPLOADS, sousDossier);
  await fs.mkdir(dossierCible, { recursive: true });

  const nomFichier = `${crypto.randomUUID()}.jpg`;
  await fs.writeFile(path.join(dossierCible, nomFichier), buffer2);

  return `${sousDossier}/${nomFichier}`;
}

// Supprime l'ancien fichier lors d'un remplacement -- pour ne jamais
// accumuler des fichiers orphelins sur le disque. Silencieux si le
// fichier n'existe deja plus (ENOENT), ce n'est pas une erreur.
export async function supprimerAncienneImage(cheminRelatif: string | null): Promise<void> {
  if (!cheminRelatif) return;
  try {
    await fs.unlink(path.join(DOSSIER_UPLOADS, cheminRelatif));
  } catch (err: any) {
    if (err.code !== "ENOENT") throw err;
  }
}
