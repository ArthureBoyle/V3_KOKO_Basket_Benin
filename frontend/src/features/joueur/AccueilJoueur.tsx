import { useSession } from '../auth/session'

// Accueil vide : la liste des tournois ou le joueur est certifie arrive ensuite.
export function AccueilJoueur() {
  const { data: session } = useSession()

  return (
    <section>
      <h1 className="text-3xl font-medium">Mes tournois</h1>
      <p className="mt-2 text-text-mute">Bonjour {session?.prenom}. Tes tournois arrivent à l'étape suivante.</p>
    </section>
  )
}
