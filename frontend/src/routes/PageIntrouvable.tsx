import { Link } from 'react-router'
import { Ballon } from '../components/ui/Ballon'

// 404 : "4", un ballon qui tourne a la place du "0", "4" — et de gros
// ballons en fond, lents et tres discrets (meme mouvement que le ballon du
// logo). Aucun texte ne passe dessous : le fond reste une decoration.
const BALLONS_FOND = [
  'top-[-6rem] left-[-7rem] size-80',
  'top-[8%] right-[-8rem] size-72',
  'bottom-[-7rem] left-[12%] size-96',
  'bottom-[6%] right-[8%] size-56 max-md:hidden',
]

export function PageIntrouvable() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-4 overflow-hidden px-8 text-center">
      {BALLONS_FOND.map((position) => (
        <Ballon
          key={position}
          mode="lent"
          className={`pointer-events-none absolute opacity-[0.12] ${position}`}
        />
      ))}

      <div className="relative flex items-center text-[7rem] leading-none font-semibold italic md:text-[10rem]">
        <span>4</span>
        <Ballon mode="rafraichit" className="mx-1 size-24 md:mx-2 md:size-36" />
        <span>4</span>
      </div>

      <h1 className="relative text-2xl font-medium md:text-3xl">Page introuvable</h1>
      <p className="relative max-w-sm text-text-mute">Cette adresse ne correspond à aucune page.</p>
      <Link
        to="/"
        className="relative mt-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-on-primary transition-opacity duration-150 hover:opacity-90"
      >
        Retour à l'accueil
      </Link>
    </main>
  )
}
