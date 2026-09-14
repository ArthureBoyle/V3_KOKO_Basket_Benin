import { useId } from 'react'

export type ModeBallon = 'arret' | 'rafraichit' | 'lent'

interface BallonProps {
  mode?: ModeBallon
  className?: string
  // Appele a chaque tour complet des coutures (voir BoutonRafraichir).
  onFinTour?: () => void
}

// SVG inline d'environ 800 octets (motion system, section 6) :
// - un cercle rempli d'un degrade radial (cx 34%, cy 28%) donne le volume ;
// - les coutures sont dans un groupe separe, decoupe par le cercle ;
// - SEULES les coutures tournent, le degrade reste fixe.
export function Ballon({ mode = 'arret', className = '', onFinTour }: BallonProps) {
  const id = useId()
  const idDegrade = `ballon-degrade-${id}`
  const idDecoupe = `ballon-decoupe-${id}`
  const classeMouvement = mode === 'rafraichit' ? 'ballon-rafraichit' : mode === 'lent' ? 'ballon-lent' : ''

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <defs>
        <radialGradient id={idDegrade} cx="34%" cy="28%" r="75%">
          <stop offset="0%" style={{ stopColor: 'var(--ballon-clair)' }} />
          <stop offset="60%" style={{ stopColor: 'var(--ballon)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--ballon-ombre)' }} />
        </radialGradient>
        <clipPath id={idDecoupe}>
          <circle cx="16" cy="16" r="14" />
        </clipPath>
      </defs>
      <circle cx="16" cy="16" r="14" fill={`url(#${idDegrade})`} />
      <g clipPath={`url(#${idDecoupe})`}>
        <g
          className={`ballon-coutures ${classeMouvement}`}
          onAnimationIteration={onFinTour}
          fill="none"
          strokeWidth="1.2"
          style={{ stroke: 'var(--ballon-couture)' }}
        >
          <line x1="2" y1="16" x2="30" y2="16" />
          <line x1="16" y1="2" x2="16" y2="30" />
          <path d="M6 5 C 12 11, 12 21, 6 27" />
          <path d="M26 5 C 20 11, 20 21, 26 27" />
        </g>
      </g>
    </svg>
  )
}
