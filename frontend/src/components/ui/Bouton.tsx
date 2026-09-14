import type { ButtonHTMLAttributes } from 'react'

type Variante = 'primaire' | 'secondaire'

interface BoutonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
}

// Texte sur fond primary = token on-primary (sombre sur terre/menthe,
// clair sur violet). Survol en opacite : gratuit cote GPU.
const CLASSES_VARIANTE: Record<Variante, string> = {
  primaire: 'bg-primary text-on-primary hover:opacity-90',
  secondaire: 'border border-border bg-elevated text-text hover:border-secondary',
}

export function Bouton({ variante = 'primaire', type = 'button', className = '', ...props }: BoutonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-[opacity,border-color] duration-150 ease-[cubic-bezier(.2,.8,.3,1)] disabled:cursor-not-allowed disabled:opacity-60 ${CLASSES_VARIANTE[variante]} ${className}`}
      {...props}
    />
  )
}
