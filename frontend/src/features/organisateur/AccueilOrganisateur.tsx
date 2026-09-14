import { useSession } from '../auth/session'

// Accueil vide : la liste des tournois (avec compteurs) arrive ensuite.
export function AccueilOrganisateur() {
  const { data: session } = useSession()

  return (
    <section>
      <h1 className="text-3xl font-medium">Mes tournois</h1>
      <p className="mt-2 text-text-mute">Bonjour {session?.prenom}. La liste de tes tournois arrive à l'étape suivante.</p>
    </section>
  )
}
