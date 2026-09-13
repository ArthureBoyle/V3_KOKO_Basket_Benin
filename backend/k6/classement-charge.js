// ================================================
// k6 — charge sur GET /tournois/:id/classement, l'endpoint le plus lourd
// en calcul qu'on ait construit (agregation de toutes les Stat du
// tournoi + moyenne bayesienne par joueur, a chaque appel, jamais mis
// en cache). Lance le seed AVANT (k6/seed.ts) pour avoir de vraies
// donnees a agreger (8 equipes, 28 matchs, 40 joueurs).
//
// Lancer : k6 run k6/classement-charge.js
// ================================================
import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = "http://localhost:4000";
const TOURNOI_ID = __ENV.TOURNOI_ID || "211"; // colle l'id renvoye par seed.ts, ou -e TOURNOI_ID=xxx

export const options = {
  scenarios: {
    charge_classement: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 20 }, // montee a 20 utilisateurs simultanes
        { duration: "20s", target: 20 }, // maintien
        { duration: "5s", target: 0 }, // redescente
      ],
    },
  },
  thresholds: {
    // 95% des requetes en moins de 500ms, sinon le run est considere
    // en echec (seuil qu'on impose nous-memes, pas une regle k6).
    http_req_duration: ["p(95)<500"],
    checks: ["rate>0.99"],
  },
};

// setup() tourne UNE SEULE FOIS (pas par utilisateur virtuel) -- on se
// connecte une fois en ADMIN, on reutilise le meme cookie partout
// ensuite. Modele realiste : les gens ne se reconnectent pas a chaque
// page vue.
export function setup() {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: "k6-admin@koko.bj", motDePasse: "K6Test123!" }),
    { headers: { "Content-Type": "application/json" } }
  );

  if (res.status !== 200) {
    throw new Error(`Login setup a echoue (${res.status}) -- as-tu lance k6/seed.ts ?`);
  }

  const accessToken = res.cookies.accessToken[0].value;
  return { accessToken };
}

export default function (data) {
  const res = http.get(`${BASE_URL}/tournois/${TOURNOI_ID}/classement`, {
    headers: { Cookie: `accessToken=${data.accessToken}` },
  });

  check(res, {
    "status 200": (r) => r.status === 200,
    "classement non vide": (r) => {
      try {
        return JSON.parse(r.body).data.length > 0;
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}
