import { useId, type InputHTMLAttributes } from 'react'

interface ChampProps extends InputHTMLAttributes<HTMLInputElement> {
  libelle: string
}

// Libelle toujours relie au champ (htmlFor/id) : cliquable, et lu par
// les lecteurs d'ecran.
export function Champ({ libelle, id, className = '', ...props }: ChampProps) {
  const idGenere = useId()
  const idChamp = id ?? idGenere

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={idChamp} className="text-sm font-medium">
        {libelle}
      </label>
      <input
        id={idChamp}
        className={`rounded-md border border-border bg-elevated px-3 py-2 text-base text-text placeholder:text-text-mute ${className}`}
        {...props}
      />
    </div>
  )
}
