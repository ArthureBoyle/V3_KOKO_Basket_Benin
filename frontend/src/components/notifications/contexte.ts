import { createContext, useContext } from 'react'

// Notifications de retour ("toasts") : confirment l'action que l'utilisateur
// vient de faire. Rien n'est stocke cote backend (pas de notifications
// persistantes pour le moment).
export type TonNotification = 'succes' | 'erreur' | 'info'

export interface Notification {
  id: number
  message: string
  ton: TonNotification
}

export type Notifier = (message: string, ton?: TonNotification) => void

export const ContexteNotifications = createContext<Notifier | null>(null)

export function useNotifier(): Notifier {
  const notifier = useContext(ContexteNotifications)
  if (!notifier) throw new Error('useNotifier doit etre utilise dans <FournisseurNotifications>')
  return notifier
}
