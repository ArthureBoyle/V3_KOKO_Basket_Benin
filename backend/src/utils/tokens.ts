// ================================================
// TOKENS — generation de l'access token et du refresh token
// ================================================
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "./prisma";
import { DUREE_REFRESH } from "./cookies";

export function generateAccessToken(userId: number, role: string) {
  return jwt.sign(
    { userId, role },
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: "15m" }
  );
}

// Hash sha256 du token brut — jamais le token en clair stocke en base.
export function hashToken(tokenBrut: string) {
  return crypto.createHash("sha256").update(tokenBrut).digest("hex");
}

/**
 * Genere un refresh token : une chaine aleatoire (PAS un JWT, rien a
 * signer ni a verifier par secret), stockee HASHEE en base avec sa date
 * d'expiration. Retourne le token BRUT (pose dans le cookie) — seul le
 * hash reste en base, jamais reconstructible depuis le hash.
 */
export async function generateRefreshToken( userId: number, dureeMs: number = DUREE_REFRESH) {
  const tokenBrut = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date(Date.now() + dureeMs);

  await prisma.refreshToken.create({
    data: { token: hashToken(tokenBrut), userId, expiresAt },
  });

  return tokenBrut;
}
