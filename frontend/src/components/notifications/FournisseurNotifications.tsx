import { useCallback, useRef, useState, type ReactNode } from 'react'
import { ContexteNotifications, type Notification, type Notifier, type TonNotification } from './contexte'

// Une erreur reste plus longtemps : il faut le temps de la lire.
const DUREE_MS: Record<TonNotification, number> = { succes: 4000, info: 4000, erreur: 7000 }
const VISIBLES_MAX = 3

const CLASSES_POINT: Record<TonNotification, string> = {
  succes: 'bg-success',
  info: 'bg-primary-text',
  erreur: 'bg-danger',
}

export function FournisseurNotifications({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const compteur = useRef(0)

  const retirer = useCallback((id: number) => {
    setNotifications((liste) => liste.filter((n) => n.id !== id))
  }, [])

  const notifier = useCallback<Notifier>(
    (message, ton = 'succes') => {
      compteur.current += 1
      const id = compteur.current
      setNotifications((liste) => [...liste, { id, message, ton }].slice(-VISIBLES_MAX))
      window.setTimeout(() => retirer(id), DUREE_MS[ton])
    },
    [retirer],
  )

  return (
    <ContexteNotifications.Provider value={notifier}>
      {children}
      {/* Zone presente des le depart : les lecteurs d'ecran annoncent ce qui y apparait. */}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        className="pointer-events-none fixed right-6 bottom-6 z-50 flex w-80 flex-col gap-2"
      >
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="notification pointer-events-auto flex items-start gap-3 rounded-lg border border-border bg-elevated px-4 py-3 text-sm"
          >
            <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${CLASSES_POINT[notification.ton]}`} />
            <p className="flex-1">{notification.message}</p>
            <button
              type="button"
              onClick={() => retirer(notification.id)}
              aria-label="Fermer la notification"
              className="text-text-mute transition-colors duration-150 hover:text-text"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ContexteNotifications.Provider>
  )
}
