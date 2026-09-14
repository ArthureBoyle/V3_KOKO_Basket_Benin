import { useState, type ReactNode } from 'react'
import { trierLignes, type SensTri } from '../../lib/tri'
import { EtatVide } from './EtatVide'
import { SqueletteLignes } from './Squelette'

// Definition d'une colonne, SEPAREE du rendu du tableau : la meme liste de
// colonnes pourra alimenter une vue en cartes sur mobile, sans toucher a la
// logique (regle desktop-first).
export interface Colonne<T> {
  cle: string
  entete: string
  rendu: (ligne: T) => ReactNode
  // Present = colonne triable.
  comparer?: (a: T, b: T) => number
  // Aligne a droite, chiffres tabulaires (colonnes qui ne bougent pas).
  numerique?: boolean
}

interface TableauProps<T> {
  colonnes: readonly Colonne<T>[]
  lignes: readonly T[] | undefined
  cleLigne: (ligne: T) => string | number
  // Nom du tableau pour les lecteurs d'ecran.
  libelle: string
  chargement?: boolean
  vide?: ReactNode
  triInitial?: { cle: string; sens: SensTri }
}

export function Tableau<T>({ colonnes, lignes, cleLigne, libelle, chargement = false, vide, triInitial }: TableauProps<T>) {
  const [tri, setTri] = useState<{ cle: string; sens: SensTri } | null>(triInitial ?? null)

  if (chargement) return <SqueletteLignes lignes={6} />
  if (!lignes || lignes.length === 0) return <>{vide ?? <EtatVide titre="Aucun élément" />}</>

  const colonneTriee = tri ? colonnes.find((colonne) => colonne.cle === tri.cle) : undefined
  const lignesAffichees =
    tri && colonneTriee?.comparer ? trierLignes(lignes, colonneTriee.comparer, tri.sens) : lignes

  const changerTri = (cle: string) =>
    setTri((actuel) => (actuel?.cle === cle ? { cle, sens: actuel.sens === 'asc' ? 'desc' : 'asc' } : { cle, sens: 'asc' }))

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{libelle}</caption>
        <thead className="bg-surface">
          <tr>
            {colonnes.map((colonne) => {
              const sens = tri?.cle === colonne.cle ? tri.sens : undefined
              return (
                <th
                  key={colonne.cle}
                  scope="col"
                  aria-sort={sens ? (sens === 'asc' ? 'ascending' : 'descending') : colonne.comparer ? 'none' : undefined}
                  className={`border-b border-border px-4 py-2.5 text-2xs font-medium tracking-[0.08em] text-text-mute uppercase ${
                    colonne.numerique ? 'text-right' : 'text-left'
                  }`}
                >
                  {colonne.comparer ? (
                    <button
                      type="button"
                      onClick={() => changerTri(colonne.cle)}
                      className="inline-flex items-center gap-1 tracking-[0.08em] uppercase transition-colors duration-150 hover:text-text"
                    >
                      {colonne.entete}
                      <span aria-hidden="true">{sens === 'asc' ? '↑' : sens === 'desc' ? '↓' : '↕'}</span>
                    </button>
                  ) : (
                    colonne.entete
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {lignesAffichees.map((ligne) => (
            <tr key={cleLigne(ligne)} className="border-b border-border last:border-b-0">
              {colonnes.map((colonne) => (
                <td key={colonne.cle} className={`px-4 py-2.5 ${colonne.numerique ? 'text-right tabular-nums' : ''}`}>
                  {colonne.rendu(ligne)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
