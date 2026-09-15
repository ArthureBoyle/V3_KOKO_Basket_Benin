import { useId, useMemo, useState } from 'react'
import { formaterNomJoueur } from '../../lib/format'

export interface JoueurRecherchable {
  idKoko: string
  nom: string
  prenom: string
  surnom: string | null
}

interface Props {
  valeur: string
  onChangerValeur: (texte: string) => void
  onSelectionner: (joueur: JoueurRecherchable) => void
  joueurs: readonly JoueurRecherchable[]
  disabled?: boolean
  erreur?: string
}

const MAX_RESULTATS = 6

// Recherche par nom/surnom/ID KOKO plutot qu'une saisie a l'aveugle de
// l'ID complet : l'admin ne doit jamais avoir a "aller chercher" l'ID
// KOKO exact d'un joueur ailleurs pour le recoller ici — il tape ce
// qu'il a sous les yeux (le nom), la liste deja chargee (GET /comptes,
// meme source que le select organisateur) fait le reste.
export function RechercheJoueur({ valeur, onChangerValeur, onSelectionner, joueurs, disabled, erreur }: Props) {
  const [ouvert, setOuvert] = useState(false)
  const [index, setIndex] = useState(-1)
  const idChamp = useId()
  const idListe = `${idChamp}-liste`

  const resultats = useMemo(() => {
    const cible = valeur.trim().toLowerCase()
    if (cible === '') return []
    return joueurs
      .filter((j) => `${j.prenom} ${j.nom} ${j.surnom ?? ''} ${j.idKoko}`.toLowerCase().includes(cible))
      .slice(0, MAX_RESULTATS)
  }, [joueurs, valeur])

  const choisir = (joueur: JoueurRecherchable) => {
    onSelectionner(joueur)
    setOuvert(false)
    setIndex(-1)
  }

  return (
    <div className="relative">
      <label htmlFor={idChamp} className="text-sm font-medium">
        Joueur
      </label>
      <input
        id={idChamp}
        role="combobox"
        aria-expanded={ouvert && resultats.length > 0}
        aria-controls={idListe}
        aria-autocomplete="list"
        aria-invalid={erreur ? true : undefined}
        autoComplete="off"
        disabled={disabled}
        value={valeur}
        placeholder="Nom, surnom ou ID KOKO…"
        onChange={(e) => {
          onChangerValeur(e.target.value)
          setOuvert(true)
          setIndex(-1)
        }}
        onFocus={() => setOuvert(true)}
        // Delai court : laisse un clic sur une option arriver avant que le
        // blur ne referme la liste (sinon onClick ne se declenche jamais).
        onBlur={() => setTimeout(() => setOuvert(false), 120)}
        onKeyDown={(e) => {
          if (!ouvert || resultats.length === 0) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setIndex((i) => Math.min(i + 1, resultats.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setIndex((i) => Math.max(i - 1, 0))
          } else if (e.key === 'Enter' && index >= 0) {
            e.preventDefault()
            choisir(resultats[index])
          } else if (e.key === 'Escape') {
            setOuvert(false)
          }
        }}
        className="mt-1.5 w-full rounded-md border border-border bg-elevated px-3 py-2 text-base text-text placeholder:text-text-mute aria-[invalid=true]:border-danger"
      />
      {erreur && <p className="mt-1 text-xs text-danger">{erreur}</p>}

      {ouvert && valeur.trim() !== '' && (
        <ul
          id={idListe}
          role="listbox"
          className="koko-cascade absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-elevated shadow-lg"
        >
          {resultats.length === 0 ? (
            <li className="px-3 py-2 text-sm text-text-mute">Aucun joueur ne correspond.</li>
          ) : (
            resultats.map((joueur, i) => (
              <li key={joueur.idKoko} role="option" aria-selected={i === index}>
                <button
                  type="button"
                  // Empeche le blur du champ AVANT que le clic ne soit traite.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choisir(joueur)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors duration-100 hover:bg-primary/10 ${i === index ? 'bg-primary/15' : ''}`}
                >
                  <span>{formaterNomJoueur(joueur)}</span>
                  <span className="font-mono text-xs text-text-mute">{joueur.idKoko}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
