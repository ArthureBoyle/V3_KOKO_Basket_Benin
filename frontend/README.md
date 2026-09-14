# KOKO V3 — Frontend

React + Vite + TypeScript strict, Tailwind v4, TanStack Query, React Router.
Desktop-first. Le backend fait foi : voir `backend/` et sa doc Swagger (`/docs`).

## Démarrer

```bash
# 1. le backend doit tourner sur http://localhost:4000
cd backend && npm run dev

# 2. le front, sur http://localhost:5173 (port fixe : seule origine autorisée par le CORS du backend)
cd frontend && npm install && npm run dev
```

L'adresse du backend vient de `VITE_API_URL` (`.env.development` en dev, voir `.env.example`).

**Build** : `npm run build` **refuse de tourner** sans `VITE_API_URL` (un build sans adresse d'API ne peut appeler aucune route). `.env.development` ne sert qu'à `npm run dev`. Pour tester le build de production en local :

```bash
VITE_API_URL=http://localhost:4000 npm run build && npm run preview
```

## Scripts

| Commande | Rôle |
|----------|------|
| `npm run dev` | serveur de développement |
| `npm run build` | vérification TypeScript (`tsc -b`) puis build de production |
| `npm run preview` | sert le build de production sur le port 5173 |
| `npm test` | tests unitaires (Vitest) |
| `npm run lint` | lint (oxlint) |

## Organisation

```
src/
  api/         client.ts : seul point d'appel au backend (cookies, enveloppe, refresh)
  types/       types des réponses backend, écrits à la main
  features/    un dossier par domaine (auth, admin, organisateur, joueur...)
  components/  composants partagés (ui/ : Bouton, Champ)
  layouts/     mise en page des espaces
  routes/      routeur, gardes de rôle
  hooks/       useTheme, useReducedMotion
  theme/       les 3 thèmes
  lib/         client TanStack Query
  styles/      CSS global : tokens de thème, Tailwind, typographie
```
