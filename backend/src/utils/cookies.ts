// ================================================
// COOKIES — configuration des deux cookies d'auth
// ================================================
// accessToken : courte duree (15 min), lu par verifierAuth sur TOUTE
// route protegee -> path par defaut ("/"), sinon les routes metier ne
// le recevraient jamais.
//
// refreshToken : longue duree (7 jours), ne sert qu'a obtenir un nouvel
// accessToken -> path restreint a "/auth" (couvre /auth/refresh ET
// /auth/logout, mais aucune route metier). Un chemin trop etroit
// (uniquement "/auth/refresh") casse le logout : le cookie n'atteint
// jamais /auth/logout, la revocation en base ne se declenche jamais, et
// le token reste valide 7 jours apres une "deconnexion".

export const CHEMIN_COOKIE_REFRESH = "/auth";

export const accessCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
  maxAge: 15 * 60 * 1000, // 15 min
};

export const DUREE_REFRESH = 7 * 24 * 60 * 60 * 1000; // 7 jours

export const refreshCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
  maxAge: DUREE_REFRESH,
  path: CHEMIN_COOKIE_REFRESH,
};
