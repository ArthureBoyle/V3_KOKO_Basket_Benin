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

// Meme forme que LayoutEspace (bande h-20 bg-elevated, sidebar w-60
// bg-surface) mais sans donnees de session (role pas encore connu, pas
// de nav ni de Logo cliquable) : utilise UNIQUEMENT le temps que
// GardeRole attend la session, pour qu'un rafraichissement force
// n'affiche jamais un ecran nu puis TOUT le chrome d'un coup (l'effet de
// "saut" signale par l'utilisateur) — juste le contenu qui se remplit,
// header et sidebar deja a leur place finale.
export function EcranChargementEspace() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-20 shrink-0 items-center border-b border-border bg-elevated px-6">
        <span className="text-[32px] leading-none font-semibold italic text-text-mute opacity-60">KOKO</span>
      </header>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="w-60 shrink-0 border-r border-border bg-surface" />
        <main role="status" className="flex flex-1 items-center justify-center text-sm text-text-mute">
          Chargement…
        </main>
      </div>
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
