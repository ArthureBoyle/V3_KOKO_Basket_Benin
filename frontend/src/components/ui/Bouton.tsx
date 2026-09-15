import type { ButtonHTMLAttributes } from 'react'
import { useEffetMagnetique } from '../../hooks/useEffetMagnetique'

type Variante = 'primaire' | 'secondaire'

interface BoutonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  // Effet magnetique (motion system, section 9) : reserve a l'action
  // PRINCIPALE d'un ecran, un seul a la fois. Ne jamais mettre sur un
  // bouton secondaire ("Annuler") ni en repeter plusieurs sur la meme page.
  magnetique?: boolean
}

// Texte sur fond primary = token on-primary (sombre sur terre/menthe,
// clair sur violet) — jamais "color: white" en dur, qui rendrait le texte
// illisible sur ces deux themes. Halo (.bouton-eleve, styles/index.css) +
// legere elevation au survol, uniquement sur le primaire : c'est LUI qui
// doit se distinguer, pas un bouton secondaire.
// Note : sur le bouton magnetique (mousemove), le decalage inline l'emporte
// sur le hover:-translate-y — attendu, un seul effet de deplacement a la fois.
const CLASSES_VARIANTE: Record<Variante, string> = {
  primaire: 'bouton-eleve bg-primary text-on-primary hover:opacity-95 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]',
  secondaire: 'border border-border bg-elevated text-text hover:border-secondary',
}

export function Bouton({
  variante = 'primaire',
  magnetique = false,
  type = 'button',
  className = '',
  ...props
}: BoutonProps) {
  const ref = useEffetMagnetique<HTMLButtonElement>(magnetique)
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-[opacity,border-color,transform,box-shadow] duration-150 ease-[cubic-bezier(.2,.8,.3,1)] disabled:cursor-not-allowed disabled:opacity-60 ${CLASSES_VARIANTE[variante]} ${className}`}
      {...props}
    />
  )
}
