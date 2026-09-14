import { Link } from 'react-router'

export function PageIntrouvable() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-8">
      <h1 className="text-3xl font-medium">Page introuvable</h1>
      <p className="text-text-mute">Cette adresse ne correspond à aucune page.</p>
      <Link to="/" className="text-sm text-primary-text underline-offset-4 hover:underline">
        Retour à l'accueil
      </Link>
    </main>
  )
}
