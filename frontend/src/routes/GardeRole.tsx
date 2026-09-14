import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { EcranChargement, EcranErreur } from '../components/EcranEtat'
import { ACCUEIL_PAR_ROLE, messageErreurSession, useSession } from '../features/auth/session'
import type { Role } from '../types/api'

// Garde d'un espace : confort d'affichage uniquement. La vraie securite
// reste le backend, qui refuse de toute facon les routes hors du role.
export function GardeRole({ role, children }: { role: Role; children: ReactNode }) {
  const { data: session, isPending, isError, error, refetch } = useSession()
  const location = useLocation()

  if (isPending) return <EcranChargement />
  if (isError) return <EcranErreur message={messageErreurSession(error)} onReessayer={() => refetch()} />

  if (!session) {
    return <Navigate to="/connexion" replace state={{ depuis: location.pathname }} />
  }

  // Connecte, mais pas dans son espace : retour a son propre accueil.
  if (session.role !== role) {
    return <Navigate to={ACCUEIL_PAR_ROLE[session.role]} replace />
  }

  return children
}
