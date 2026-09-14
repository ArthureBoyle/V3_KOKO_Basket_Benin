/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ command, mode }) => {
  // Un build SANS adresse du backend donne une application qui n'appelle
  // aucune route et affiche une erreur (constate en test sur le build).
  // On refuse de le produire. .env.development ne sert qu'a "npm run dev" :
  // pour un build, VITE_API_URL doit etre fourni (voir .env.example).
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  if (command === 'build' && !env.VITE_API_URL) {
    throw new Error('VITE_API_URL manquant pour le build : voir frontend/.env.example')
  }

  return {
    plugins: [react(), tailwindcss()],
    // Port FIXE : le backend n'autorise (CORS) que http://localhost:5173.
    // strictPort : si 5173 est deja pris, Vite s'arrete au lieu de passer
    // en silence sur 5174 — ou toutes les requetes seraient refusees.
    server: { port: 5173, strictPort: true },
    preview: { port: 5173, strictPort: true },
    test: { environment: 'node' },
  }
})
