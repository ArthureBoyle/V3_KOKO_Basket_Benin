import { urlImage } from '../../lib/format'

interface LogoEquipeProps {
  couleur: string
  logo?: string | null
  // Classes de taille (ex. "size-5"). Defaut : la petite pastille des listes.
  className?: string
}

// Logo de l'equipe s'il existe, sinon la pastille de sa couleur. Carre aux
// coins arrondis (comme le reste de l'app), jamais un cercle qui rognerait
// un logo.
export function LogoEquipe({ couleur, logo, className = 'size-4' }: LogoEquipeProps) {
  if (logo) {
    return (
      <img
        src={urlImage(logo)}
        alt=""
        className={`${className} shrink-0 rounded-md border border-border bg-elevated object-cover`}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className={`${className} shrink-0 rounded-full border border-border`}
      style={{ backgroundColor: couleur }}
    />
  )
}
