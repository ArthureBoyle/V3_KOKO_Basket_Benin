import { Bouton } from './ui/Bouton'

// Ecrans d'attente et d'erreur plein ecran, le temps de savoir qui est
// connecte. Le ballon anime du motion system viendra les remplacer.
export function EcranChargement() {
  return (
    <div role="status" className="flex min-h-screen items-center justify-center text-sm text-text-mute">
      Chargement…
    </div>
  )
}

export function EcranErreur({ message, onReessayer }: { message: string; onReessayer: () => void }) {
  return (
    <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-base">{message}</p>
      <Bouton variante="secondaire" onClick={onReessayer}>
        Réessayer
      </Bouton>
    </div>
  )
}
