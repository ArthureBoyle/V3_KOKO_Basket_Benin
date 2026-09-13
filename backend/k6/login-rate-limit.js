// ================================================
// k6 — verifie que limiteurLogin (10 tentatives / 15 min / IP) tient
// vraiment sous une charge CONCURRENTE reelle, pas juste une boucle
// sequentielle comme dans Vitest (ou chaque `await` attend son tour,
// donc jamais de vraie simultaneite).
//
// 15 utilisateurs virtuels, TOUS en meme temps (meme IP locale) ->
// attendu : ~10 succes (200), le reste bloque (429).
//
// Lancer : k6 run k6/login-rate-limit.js
// ================================================
import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";

const BASE_URL = "http://localhost:4000";

const succes200 = new Counter("login_succes_200");
const bloques429 = new Counter("login_bloques_429");

export const options = {
  scenarios: {
    spam_login: {
      executor: "shared-iterations",
      vus: 15,
      iterations: 15,
      maxDuration: "15s",
    },
  },
};

export default function () {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: "k6-admin@koko.bj", motDePasse: "K6Test123!" }),
    { headers: { "Content-Type": "application/json" } }
  );

  check(res, {
    "status 200 ou 429 (rien d'autre)": (r) => r.status === 200 || r.status === 429,
  });

  if (res.status === 200) succes200.add(1);
  if (res.status === 429) bloques429.add(1);
}
