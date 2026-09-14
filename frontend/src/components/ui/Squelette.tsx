// Forme du contenu pendant le chargement : la page ne saute pas quand les
// donnees arrivent. Plafond de 10 lignes (motion system : le reflet anime
// background-position, qui n'est pas du GPU pur).
export function Squelette({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`squelette rounded-md ${className}`} />
}

const LIGNES_MAX = 10

export function SqueletteLignes({ lignes = 5 }: { lignes?: number }) {
  const nombre = Math.min(Math.max(lignes, 1), LIGNES_MAX)
  return (
    <div role="status" aria-label="Chargement" className="flex flex-col gap-2">
      {Array.from({ length: nombre }, (_, index) => (
        <Squelette key={index} className="h-9" />
      ))}
    </div>
  )
}
