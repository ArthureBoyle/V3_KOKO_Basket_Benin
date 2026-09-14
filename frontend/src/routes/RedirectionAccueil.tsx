import { Navigate } from 'react-router'
import { EcranChargement, EcranErreur } from '../components/EcranEtat'
import { ACCUEIL_PAR_ROLE, messageErreurSession, useSession } from '../features/auth/session'

// "/" : aiguille vers l'accueil du role connecte, ou vers la connexion.
export function RedirectionAccueil() {
  const { data: session, isPending, isError, error, refetch } = useSession()

  if (isPending) return <EcranChargement />
  if (isError) return <EcranErreur message={messageErreurSession(error)} onReessayer={() => refetch()} />

  return <Navigate to={session ? ACCUEIL_PAR_ROLE[session.role] : '/connexion'} replace />
}
