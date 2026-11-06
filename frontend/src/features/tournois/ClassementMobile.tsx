import { useState, type ReactNode } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Dialogue } from '../../components/ui/Dialogue'
import { formaterNombre } from '../../lib/format'
import type { EquipeClassee, JoueurClasse } from '../../types/api'
import { medaille, styleLignePodium } from './constantes'
import { LogoEquipe } from '../../components/ui/LogoEquipe'

// Partage par l'espace joueur ET l'espace organisateur/admin.
// Mobile : le classement n'est QU'UN ORDRE (rang + nom). Les chiffres
// sont dans une fiche qui s'ouvre au toucher — un tableau de 6 colonnes
// ne tient pas sur 390 px.

function Rang({ rang }: { rang: number }) {
  const m = medaille(rang)
  return (
    <span className="flex w-8 shrink-0 justify-center text-base font-semibold text-text-mute tabular-nums">
      {m ? (
        <span aria-label={`Rang ${rang}`} className="text-xl leading-none">
          {m}
        </span>
      ) : (
        rang
      )}
    </span>
  )
}

function Ligne({
  rang,
  onClick,
  surbrillance,
  etiquette,
  children,
}: {
  rang: number
  onClick: () => void
  surbrillance?: ReturnType<typeof styleLignePodium>
  etiquette: string
  children: ReactNode
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-label={etiquette}
        style={surbrillance}
        className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3.5 text-left transition-colors duration-150 hover:border-primary hover:bg-elevated"
      >
        <Rang rang={rang} />
        <span className="min-w-0 flex-1 font-medium">{children}</span>
        <span aria-hidden="true" className="text-text-mute">
          ›
        </span>
      </button>
    </li>
  )
}

function Info({ libelle, valeur }: { libelle: string; valeur: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-3 first:border-t">
      <dt className="text-sm text-text-mute">{libelle}</dt>
      <dd className="text-right font-medium tabular-nums">{valeur}</dd>
    </div>
  )
}

function Entete({ rang, children, sousTitre }: { rang: number; children: ReactNode; sousTitre?: ReactNode }) {
  const m = medaille(rang)
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border bg-elevated text-lg font-semibold tabular-nums">
        {m ?? `#${rang}`}
      </span>
      <div className="min-w-0">
        <p className="text-lg leading-tight font-semibold break-words">{children}</p>
        {sousTitre && <p className="mt-0.5 text-sm text-text-mute">{sousTitre}</p>}
      </div>
    </div>
  )
}

export function ClassementEquipesMobile({ equipes }: { equipes: EquipeClassee[] }) {
  const [choisie, setChoisie] = useState<EquipeClassee | null>(null)
  return (
    <>
      <ul className="flex flex-col gap-2 md:hidden">
        {equipes.map((e) => (
          <Ligne
            key={e.id}
            rang={e.rang}
            surbrillance={styleLignePodium(e.rang)}
            etiquette={`Statistiques de ${e.nom}`}
            onClick={() => setChoisie(e)}
          >
            <span className="flex items-center gap-2">
              <LogoEquipe couleur={e.couleur} logo={e.logo} className="size-6" />
              <span className="min-w-0 truncate">{e.nom}</span>
            </span>
          </Ligne>
        ))}
      </ul>
      <Dialogue ouvert={choisie !== null} onFermer={() => setChoisie(null)} titre="Statistiques de l'équipe">
        {choisie && (
          <div>
            <Entete rang={choisie.rang}>
              <span className="flex items-center gap-2">
                <LogoEquipe couleur={choisie.couleur} logo={choisie.logo} className="size-8" />
                {choisie.nom}
              </span>
            </Entete>
            <dl>
              <Info libelle="Classement" valeur={choisie.rang} />
              <Info libelle="Victoires" valeur={choisie.victoires} />
              <Info libelle="Défaites" valeur={choisie.defaites} />
              <Info libelle="Points" valeur={choisie.points} />
            </dl>
          </div>
        )}
      </Dialogue>
    </>
  )
}

export function ClassementJoueursMobile({
  joueurs,
  nomEquipe,
  monJoueurId = null,
  styleMoi = (rang) => styleLignePodium(rang),
}: {
  joueurs: JoueurClasse[]
  nomEquipe: (id: number) => string
  // Joueur connecte (espace joueur seulement) : mis en avant dans la liste.
  monJoueurId?: number | null
  styleMoi?: (rang: number, estMoi: boolean) => ReturnType<typeof styleLignePodium>
}) {
  const [choisi, setChoisi] = useState<JoueurClasse | null>(null)
  const nom = (j: JoueurClasse) => `${j.prenom ?? ''} ${j.nomLegal ?? ''}`.trim() || '—'
  return (
    <>
      <ul className="flex flex-col gap-2 md:hidden">
        {joueurs.map((j) => (
          <Ligne
            key={j.joueurId}
            rang={j.rang}
            surbrillance={styleMoi(j.rang, j.joueurId === monJoueurId)}
            etiquette={`Statistiques de ${nom(j)}`}
            onClick={() => setChoisi(j)}
          >
            <span className="block truncate">
              {nom(j)}
              {j.joueurId === monJoueurId && <span className="ml-2 text-xs text-primary-text">(toi)</span>}
            </span>
          </Ligne>
        ))}
      </ul>
      <Dialogue ouvert={choisi !== null} onFermer={() => setChoisi(null)} titre="Statistiques du joueur">
        {choisi && (
          <div>
            <Entete
              rang={choisi.rang}
              sousTitre={`${nomEquipe(choisi.equipeId)}${choisi.idKoko ? ` · ${choisi.idKoko}` : ''}`}
            >
              {nom(choisi)}
            </Entete>
            <dl>
              <Info libelle="Classement" valeur={choisi.rang} />
              <Info
                libelle="Score"
                valeur={choisi.score < 0 ? `− ${Math.abs(choisi.score).toFixed(1)}` : choisi.score.toFixed(1)}
              />
              <Info libelle="Matchs joués" valeur={choisi.matchsJoues} />
              <Info libelle="Points" valeur={formaterNombre(choisi.totalPts)} />
              <Info libelle="Fautes" valeur={choisi.totalFautes} />
              <Info libelle="Contres" valeur={choisi.totalContres} />
              <Info libelle="Temps de jeu" valeur={choisi.totalTempsJeu} />
            </dl>
            {choisi.faibleEchantillon && (
              <p className="mt-4 flex items-center gap-2 text-xs text-text-mute">
                <Badge ton="alerte">échantillon faible</Badge>
                Peu de matchs joués : à lire avec prudence.
              </p>
            )}
          </div>
        )}
      </Dialogue>
    </>
  )
}
