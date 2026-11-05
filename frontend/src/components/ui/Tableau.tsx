import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router'
import { styleCascade } from '../../hooks/useCascade'
import { trierLignes, type SensTri } from '../../lib/tri'
import type { TonBadge } from './Badge'
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
  // Chiffres tabulaires (largeur fixe, les colonnes ne bougent pas quand
  // les valeurs changent) : a mettre sur toute colonne numerique.
  numerique?: boolean
  // Alignement visuel. Par defaut a gauche. "centre" convient a un petit
  // nombre isole (compteur), "droite" a une vraie colonne de chiffres
  // alignes (age, montant) — voir la difference dans ListeComptes.
  align?: 'gauche' | 'centre' | 'droite'
  // Largeur relative de la colonne ("1.6fr", "0.9fr"...) : la MEME valeur
  // sert a construire le grid-template-columns de l'en-tete ET de chaque
  // ligne — c'est ce qui garantit l'alignement pixel pres entre les deux,
  // plutot que deux grilles definies separement qui peuvent diverger.
  // Par defaut "1fr" (colonnes egales).
  largeur?: string
}

const CLASSES_ALIGNEMENT = { gauche: 'text-left', centre: 'text-center', droite: 'text-right' } as const
const CLASSES_JUSTIFY = { gauche: 'justify-start', centre: 'justify-center', droite: 'justify-end' } as const

interface TableauProps<T> {
  colonnes: readonly Colonne<T>[]
  lignes: readonly T[] | undefined
  cleLigne: (ligne: T) => string | number
  // Nom du tableau pour les lecteurs d'ecran.
  libelle: string
  chargement?: boolean
  vide?: ReactNode
  triInitial?: { cle: string; sens: SensTri }
  // Actualisation en ARRIERE-PLAN : les donnees affichees sont deja la
  // (contrairement a "chargement", qui les remplace par le squelette), on
  // signale juste qu'une verification est en cours (isFetching sans
  // isLoading — voir ListeComptes). Ballon en tete de page = meme signal,
  // ce balayage confirme qu'il agit bien sur CE tableau.
  actualisation?: boolean
  // Couleur d'accent de chaque ligne (liseret gauche), meme ton que les
  // badges de statut. Sans cette fonction, toutes les lignes restent
  // neutres (bordure standard, pas de liseret colore).
  tonLigne?: (ligne: T) => TonBadge
  // Style inline supplementaire, ligne par ligne — pour un accent qui ne
  // rentre PAS dans les tons semantiques de TonBadge (ex. or/argent/
  // bronze du podium, des couleurs d'OBJET comme --ballon-*, jamais des
  // etats). Prioritaire sur tonLigne (applique apres, en inline).
  styleLigne?: (ligne: T) => CSSProperties | undefined
  // Si fourni, chaque ligne devient un lien (ex. vers sa fiche detaillee).
  lienLigne?: (ligne: T) => string
}

const CLASSES_ACCENT: Record<TonBadge, string> = {
  neutre: 'border-l-border',
  primaire: 'border-l-primary',
  succes: 'border-l-success',
  alerte: 'border-l-warning',
  danger: 'border-l-danger',
}

// Cartes empilees (jamais un <table> HTML), mais toujours annoncees comme
// un tableau aux lecteurs d'ecran via les roles ARIA table/row/columnheader/
// cell — memes annonces qu'un <table>, sans etre visuellement rigide.
export function Tableau<T>({
  colonnes,
  lignes,
  cleLigne,
  libelle,
  chargement = false,
  vide,
  triInitial,
  actualisation = false,
  tonLigne,
  styleLigne,
  lienLigne,
}: TableauProps<T>) {
  const [tri, setTri] = useState<{ cle: string; sens: SensTri } | null>(triInitial ?? null)

  if (chargement) return <SqueletteLignes lignes={6} />
  if (!lignes || lignes.length === 0) return <>{vide ?? <EtatVide titre="Aucun élément" />}</>

  const colonneTriee = tri ? colonnes.find((colonne) => colonne.cle === tri.cle) : undefined
  const lignesAffichees =
    tri && colonneTriee?.comparer ? trierLignes(lignes, colonneTriee.comparer, tri.sens) : lignes

  const changerTri = (cle: string) =>
    setTri((actuel) => (actuel?.cle === cle ? { cle, sens: actuel.sens === 'asc' ? 'desc' : 'asc' } : { cle, sens: 'asc' }))

  // Calculee UNE fois a partir des colonnes, appliquee identique a l'en-tete
  // et a chaque ligne : la seule facon de garantir qu'un label tombe pile
  // au-dessus de sa valeur, plutot que deux grilles qui peuvent deriver.
  const gridTemplateColumns = colonnes.map((colonne) => colonne.largeur ?? '1fr').join(' ')

  return (
    <div role="table" aria-label={libelle} className="relative">
      {actualisation && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-xl">
          <div className="balayage-lumiere h-full w-1/4 bg-gradient-to-r from-transparent via-primary-text/15 to-transparent" />
        </div>
      )}

      {/* border-transparent DE LA MEME LARGEUR que les cartes en dessous :
          Tailwind est en box-sizing:border-box, donc la bordure des cartes
          (border + border-l-2) mange 3px sur leur largeur de contenu. Sans
          cette bordure fantome ici, l'en-tete calculerait ses colonnes sur
          une largeur legerement plus grande que les cartes — un ecart
          sous le pixel, mais un ecart quand meme. */}
      {/* Cachee sur mobile : chaque cellule porte deja son propre libelle
          en ligne juste en dessous (voir les cellules plus bas) — sur un
          ecran etroit, cette rangee d'en-tetes en colonnes n'a plus de
          sens (voir la rangee suivante, passee en carte empilee). Le tri
          au clic devient indisponible sur mobile : compromis assume,
          jamais l'enjeu principal d'un ecran de telephone. */}
      <div
        role="row"
        className="grid gap-x-4 border border-l-2 border-transparent px-4 pb-2.5 max-md:hidden"
        style={{ gridTemplateColumns }}
      >
        {colonnes.map((colonne) => {
          const sens = tri?.cle === colonne.cle ? tri.sens : undefined
          const alignement = colonne.align ?? (colonne.numerique ? 'droite' : 'gauche')
          return (
            <span
              key={colonne.cle}
              role="columnheader"
              aria-sort={sens ? (sens === 'asc' ? 'ascending' : 'descending') : colonne.comparer ? 'none' : undefined}
              className={`text-2xs font-medium tracking-[0.08em] text-text-mute uppercase ${CLASSES_ALIGNEMENT[alignement]}`}
            >
              {colonne.comparer ? (
                <button
                  type="button"
                  onClick={() => changerTri(colonne.cle)}
                  className={`flex w-full items-center gap-1 tracking-[0.08em] uppercase transition-colors duration-150 hover:text-text ${CLASSES_JUSTIFY[alignement]}`}
                >
                  {/* Aligne "droite" : la fleche doit rester APRES le
                      libelle dans l'ORDRE VISUEL mais le libelle doit
                      rester l'element le plus a droite — sinon justify-end
                      pousse la fleche (dernier enfant) au bord, et le
                      libelle se retrouve decale par rapport au chiffre nu
                      de la cellule juste en dessous, qui lui colle
                      vraiment au bord. Inverser l'ordre DOM regle ca sans
                      dupliquer la fleche ni tricher sur le sens de lecture
                      (elle reste juste avant le mot, jamais collee a un
                      autre mot). */}
                  {alignement === 'droite' ? (
                    <>
                      <span aria-hidden="true">{sens === 'asc' ? '↑' : sens === 'desc' ? '↓' : '↕'}</span>
                      {colonne.entete}
                    </>
                  ) : (
                    <>
                      {colonne.entete}
                      <span aria-hidden="true">{sens === 'asc' ? '↑' : sens === 'desc' ? '↓' : '↕'}</span>
                    </>
                  )}
                </button>
              ) : (
                colonne.entete
              )}
            </span>
          )
        })}
      </div>

      {/* flex-col + gap : cartes separees, jamais des lignes collees. */}
      <div className="flex flex-col gap-2.5">
        {lignesAffichees.map((ligne, index) => {
          // grid-cols-[var(--grille)] plutot que le gridTemplateColumns
          // en inline direct : un style inline ne peut JAMAIS etre battu
          // par un media query classique — passer par une variable CSS
          // permet a max-md:grid-cols-1 (classe, donc en feuille de
          // style) de reprendre la main sur mobile, la ligne devenant une
          // carte a un seul "colonne" (chaque cellule empilee) au lieu
          // d'une grille aussi large que sur desktop.
          const classeLigne = `koko-cascade grid grid-cols-[var(--grille)] items-center gap-x-4 max-md:grid-cols-1 max-md:gap-y-2.5 rounded-r-xl rounded-l-sm border border-border border-l-2 bg-surface px-4 py-3.5 max-md:py-4 transition-[border-color,background-color,transform] duration-200 hover:border-primary hover:bg-elevated hover:translate-x-0.5 ${CLASSES_ACCENT[tonLigne?.(ligne) ?? 'primaire']}`
          const styleCalcule = {
            '--grille': gridTemplateColumns,
            ...styleCascade(index),
            ...styleLigne?.(ligne),
          } as CSSProperties
          const cellules = colonnes.map((colonne) => {
            const alignement = colonne.align ?? (colonne.numerique ? 'droite' : 'gauche')
            return (
              <div
                key={colonne.cle}
                role="cell"
                className={`${CLASSES_ALIGNEMENT[alignement]} max-md:text-left ${colonne.numerique ? 'tabular-nums' : ''}`}
              >
                {/* Libelle visible SEULEMENT sur mobile : sans lui, une
                    fois la grille empilee en carte, plus rien n'indique
                    ce que represente chaque valeur (l'en-tete du dessus
                    est cachee, voir plus haut). */}
                <span className="hidden max-md:mb-0.5 max-md:block max-md:text-2xs max-md:font-medium max-md:tracking-[0.08em] max-md:text-text-mute max-md:uppercase">
                  {colonne.entete}
                </span>
                {colonne.rendu(ligne)}
              </div>
            )
          })
          // Deux branches distinctes (plutot qu'un composant choisi
          // dynamiquement) : <Link> et <div> n'acceptent pas les memes
          // props, TypeScript ne peut pas reconcilier les deux d'un coup.
          return lienLigne ? (
            <Link key={cleLigne(ligne)} to={lienLigne(ligne)} role="row" style={styleCalcule} className={classeLigne}>
              {cellules}
            </Link>
          ) : (
            <div key={cleLigne(ligne)} role="row" style={styleCalcule} className={classeLigne}>
              {cellules}
            </div>
          )
        })}
      </div>
    </div>
  )
}
