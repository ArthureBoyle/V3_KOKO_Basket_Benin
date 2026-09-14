/// <reference types="vite/client" />

// Variables d'environnement lues par le front (voir .env.example).
interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
