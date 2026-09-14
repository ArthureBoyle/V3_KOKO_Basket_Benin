import { useSession } from '../auth/session'

// Accueil vide : le dashboard de supervision arrive avec les ecrans admin.
export function AccueilAdmin() {
  const { data: session } = useSession()

  return (
    <section>
      <h1 className="text-3xl font-medium">Supervision</h1>
      <p className="mt-2 text-text-mute">Bonjour {session?.prenom}. Les écrans d'administration arrivent à l'étape suivante.</p>
    </section>
  )
}
