import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import { ApiError } from '../../api/client'
import { EcranChargement } from '../../components/EcranEtat'
import { Bouton } from '../../components/ui/Bouton'
import { Champ } from '../../components/ui/Champ'
import { ACCUEIL_PAR_ROLE, useConnexion, useSession } from './session'

// Messages ecrits cote front : ceux du backend sont techniques et sans
// accents. Le 401 ne distingue jamais "email inconnu" de "mauvais mot de
// passe" — le backend non plus, volontairement.
const MESSAGES_PAR_STATUT: Record<number, string> = {
  0: 'Serveur injoignable. Vérifie ta connexion et réessaie.',
  400: "Vérifie le format de l'email.",
  401: 'Email ou mot de passe incorrect.',
  403: "Ce compte a été désactivé. Contacte l'administrateur.",
  429: 'Trop de tentatives. Réessaie dans quelques minutes.',
}

function messageErreur(erreur: unknown): string {
  if (erreur instanceof ApiError && MESSAGES_PAR_STATUT[erreur.status]) {
    return MESSAGES_PAR_STATUT[erreur.status]
  }
  return 'Connexion impossible pour le moment.'
}

export function PageConnexion() {
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const { data: session, isPending } = useSession()
  const connexion = useConnexion()
  const location = useLocation()

  if (isPending) return <EcranChargement />

  if (session) {
    // Retour a la page demandee avant la connexion, si elle appartient
    // bien a l'espace de ce role ; sinon accueil du role.
    const accueil = ACCUEIL_PAR_ROLE[session.role]
    const depuis = (location.state as { depuis?: string } | null)?.depuis
    return <Navigate to={depuis?.startsWith(accueil) ? depuis : accueil} replace />
  }

  const soumettre = (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    connexion.mutate({ email: email.trim(), motDePasse })
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-8">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8">
        <h1 className="text-2xl font-medium">KOKO</h1>
        <p className="mt-1 text-sm text-text-mute">
          Connecte-toi avec les identifiants fournis par l'administrateur.
        </p>

        <form className="mt-8 flex flex-col gap-5" onSubmit={soumettre} noValidate>
          <Champ
            libelle="Email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Champ
            libelle="Mot de passe"
            type="password"
            autoComplete="current-password"
            required
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />

          {connexion.isError && (
            <p role="alert" className="text-sm text-danger">
              {messageErreur(connexion.error)}
            </p>
          )}

          <Bouton type="submit" disabled={connexion.isPending || !email || !motDePasse}>
            {connexion.isPending ? 'Connexion…' : 'Se connecter'}
          </Bouton>
        </form>

        <p className="mt-6 text-xs text-text-mute">Identifiants perdus : contacte l'administrateur KOKO.</p>
      </div>
    </main>
  )
}
