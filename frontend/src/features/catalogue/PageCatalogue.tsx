import { useQuery } from '@tanstack/react-query'
import { useRef, useState, type ReactNode } from 'react'
import { ApiError } from '../../api/client'
import { EnTetePage } from '../../components/EnTetePage'
import { useNotifier } from '../../components/notifications/contexte'
import { Badge, BadgeStatutMatch, BadgeStatutTournoi } from '../../components/ui/Badge'
import { Bouton } from '../../components/ui/Bouton'
import { BoutonRafraichir } from '../../components/ui/BoutonRafraichir'
import { Champ, ChampDateHeure, ChampJour, ChampSelect, ChampZoneTexte } from '../../components/ui/Champ'
import { Dialogue } from '../../components/ui/Dialogue'
import { DialogueCodeAdmin } from '../../components/ui/DialogueCodeAdmin'
import { EtatVide } from '../../components/ui/EtatVide'
import { Onglets, PanneauOnglet } from '../../components/ui/Onglets'
import { SqueletteLignes } from '../../components/ui/Squelette'
import { Tableau, type Colonne } from '../../components/ui/Tableau'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useTheme } from '../../hooks/useTheme'
import { formaterAge, formaterDateHeure, formaterJour, formaterNombre } from '../../lib/format'
import { comparerNombre, comparerTexte } from '../../lib/tri'
import { estTheme, THEMES } from '../../theme/theme'
import type { StatutMatch, StatutTournoi } from '../../types/api'

// ================================================
// CATALOGUE (developpement uniquement, absent du build de production) :
// chaque composant de la phase 1 avec des donnees de demonstration, pour le
// voir dans les 3 themes et le tester avant qu'un vrai ecran l'utilise.
// ================================================

const CODE_DEMO = 'Code-Demo-2026'

interface JoueurDemo {
  id: number
  nom: string
  idKoko: string
  age: number
  points: number
  statut: StatutMatch
}

const JOUEURS_DEMO: JoueurDemo[] = [
  { id: 1, nom: 'Zinsou Koffi', idKoko: 'KOKO-2026-4821', age: 24, points: 128, statut: 'TERMINE' },
  { id: 2, nom: 'Émile Adjovi', idKoko: 'KOKO-2026-1093', age: 19, points: 1204, statut: 'EN_RETARD' },
  { id: 3, nom: 'dossou Rita', idKoko: 'KOKO-2026-7710', age: 31, points: 87, statut: 'A_VENIR' },
  { id: 4, nom: 'Fagla Serge', idKoko: 'KOKO-2026-3342', age: 1, points: 342, statut: 'REPORTE' },
]

const COLONNES_DEMO: Colonne<JoueurDemo>[] = [
  { cle: 'nom', entete: 'Nom', rendu: (j) => j.nom, comparer: (a, b) => comparerTexte(a.nom, b.nom) },
  { cle: 'idKoko', entete: 'ID KOKO', rendu: (j) => <span className="font-mono text-xs">{j.idKoko}</span> },
  { cle: 'age', entete: 'Âge', rendu: (j) => formaterAge(j.age), comparer: (a, b) => comparerNombre(a.age, b.age), numerique: true },
  { cle: 'points', entete: 'Points', rendu: (j) => formaterNombre(j.points), comparer: (a, b) => comparerNombre(a.points, b.points), numerique: true },
  { cle: 'statut', entete: 'Dernier match', rendu: (j) => <BadgeStatutMatch statut={j.statut} /> },
]

const ONGLETS_DEMO = [
  { id: 'infos', libelle: 'Infos' },
  { id: 'licences', libelle: 'Licences' },
  { id: 'equipes', libelle: 'Équipes' },
] as const

const STATUTS_TOURNOI: StatutTournoi[] = ['A_VENIR', 'ACTIF', 'TERMINE', 'ANNULE']
const STATUTS_MATCH: StatutMatch[] = ['A_VENIR', 'EN_RETARD', 'REPORTE', 'TERMINE', 'ANNULE']

function Section({ id, titre, children }: { id: string; titre: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-border bg-surface p-6">
      <h2 id={id} className="mb-5 text-xl font-medium">
        {titre}
      </h2>
      {children}
    </section>
  )
}

export function PageCatalogue() {
  const notifier = useNotifier()
  const { theme, changerTheme } = useTheme()
  const mouvementReduit = useReducedMotion()

  // Tableau
  const [modeTableau, setModeTableau] = useState<'donnees' | 'chargement' | 'vide'>('donnees')

  // Fenetres
  const [dialogueOuvert, setDialogueOuvert] = useState(false)
  const [codeOuvert, setCodeOuvert] = useState(false)
  const refusDemo = useRef(0)

  // Champs
  const [jour, setJour] = useState('')
  const [instant, setInstant] = useState<string | null>(null)
  const [nomDemo, setNomDemo] = useState('')

  // Onglets
  const [onglet, setOnglet] = useState<string>('infos')

  // Ballon : fausse requete, rapide (300 ms) ou lente (2,5 s)
  const [requeteLente, setRequeteLente] = useState(false)
  const demo = useQuery({
    queryKey: ['catalogue-rafraichir', requeteLente],
    queryFn: () => new Promise<number>((resolve) => setTimeout(() => resolve(Date.now()), requeteLente ? 2500 : 300)),
    staleTime: Infinity,
  })

  // Simule le backend : 5 codes refuses -> 429 (limiteurCodeAdmin).
  const confirmerAvecCode = async (code: string) => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    if (refusDemo.current >= 5) throw new ApiError(429, 'Trop de tentatives, reessaie plus tard')
    if (code !== CODE_DEMO) {
      refusDemo.current += 1
      throw new ApiError(403, 'Code admin invalide')
    }
    notifier('Action confirmée (démo)', 'succes')
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-8 py-10">
      <EnTetePage
        titre="Catalogue des composants"
        description="Page de développement : absente du build de production."
        actions={
          <label className="flex items-center gap-2 text-sm text-text-mute">
            Thème
            <select
              value={theme}
              onChange={(e) => {
                if (estTheme(e.target.value)) changerTheme(e.target.value)
              }}
              className="rounded-md border border-border bg-elevated px-2 py-1 text-sm text-text"
            >
              {THEMES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.libelle}
                </option>
              ))}
            </select>
          </label>
        }
      />

      <Section id="section-tableau" titre="📋 Tableau · 💀 Squelette · 🫙 État vide">
        <div className="mb-4 flex gap-2">
          <Bouton variante={modeTableau === 'donnees' ? 'primaire' : 'secondaire'} onClick={() => setModeTableau('donnees')}>
            Données
          </Bouton>
          <Bouton variante={modeTableau === 'chargement' ? 'primaire' : 'secondaire'} onClick={() => setModeTableau('chargement')}>
            Chargement
          </Bouton>
          <Bouton variante={modeTableau === 'vide' ? 'primaire' : 'secondaire'} onClick={() => setModeTableau('vide')}>
            Vide
          </Bouton>
        </div>
        <Tableau
          libelle="Joueurs de démonstration"
          colonnes={COLONNES_DEMO}
          lignes={modeTableau === 'vide' ? [] : JOUEURS_DEMO}
          cleLigne={(j) => j.id}
          chargement={modeTableau === 'chargement'}
          vide={
            <EtatVide
              titre="Aucun joueur"
              description="Les joueurs apparaissent ici une fois assignés au tournoi."
              action={<Bouton onClick={() => setModeTableau('donnees')}>Remettre les données</Bouton>}
            />
          }
        />
        <div className="mt-6 max-w-sm">
          <p className="mb-2 text-sm text-text-mute">Squelette seul (plafonné à 10 lignes même si on en demande 50) :</p>
          <SqueletteLignes lignes={50} />
        </div>
      </Section>

      <Section id="section-badges" titre="🏷️ Badges de statut">
        <p className="mb-2 text-sm text-text-mute">Tournoi</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {STATUTS_TOURNOI.map((statut) => (
            <BadgeStatutTournoi key={statut} statut={statut} />
          ))}
        </div>
        <p className="mb-2 text-sm text-text-mute">Match</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {STATUTS_MATCH.map((statut) => (
            <BadgeStatutMatch key={statut} statut={statut} />
          ))}
        </div>
        <p className="mb-2 text-sm text-text-mute">Joueur connecté uniquement</p>
        <div className="flex gap-2">
          <Badge ton="succes">Victoire</Badge>
          <Badge ton="danger">Défaite</Badge>
        </div>
      </Section>

      <Section id="section-fenetres" titre="🪟 Fenêtre · 🔐 Code secret admin · 🔔 Notifications">
        <div className="flex flex-wrap gap-3">
          <Bouton variante="secondaire" onClick={() => setDialogueOuvert(true)}>
            Ouvrir une fenêtre
          </Bouton>
          <Bouton variante="secondaire" onClick={() => setCodeOuvert(true)}>
            Action protégée (code)
          </Bouton>
          <Bouton
            variante="secondaire"
            onClick={() => {
              refusDemo.current = 0
              notifier('Compteur de refus remis à zéro', 'info')
            }}
          >
            Réinitialiser les refus
          </Bouton>
          <Bouton variante="secondaire" onClick={() => notifier('Compte créé', 'succes')}>
            Notifier un succès
          </Bouton>
          <Bouton variante="secondaire" onClick={() => notifier('Le serveur a refusé la modification', 'erreur')}>
            Notifier une erreur
          </Bouton>
        </div>
        <p className="mt-3 text-sm text-text-mute">
          Code de démonstration : <span className="font-mono">{CODE_DEMO}</span> — 5 codes faux puis 6e essai = blocage 429.
        </p>

        <Dialogue
          ouvert={dialogueOuvert}
          onFermer={() => setDialogueOuvert(false)}
          titre="Supprimer l'équipe ?"
          description="L'équipe est vide : sa suppression est définitive."
        >
          <div className="flex justify-end gap-3">
            <Bouton variante="secondaire" onClick={() => setDialogueOuvert(false)}>
              Annuler
            </Bouton>
            <Bouton
              onClick={() => {
                setDialogueOuvert(false)
                notifier('Équipe supprimée (démo)', 'succes')
              }}
            >
              Supprimer
            </Bouton>
          </div>
        </Dialogue>

        <DialogueCodeAdmin
          ouvert={codeOuvert}
          onFermer={() => setCodeOuvert(false)}
          titre="Désactiver le compte ?"
          description="Le compte ne pourra plus se connecter. Action protégée par ton code secret."
          libelleConfirmation="Désactiver"
          onConfirmer={confirmerAvecCode}
        />
      </Section>

      <Section id="section-champs" titre="📝 Champs de formulaire">
        <div className="grid grid-cols-2 gap-5">
          <Champ
            libelle="Nom"
            value={nomDemo}
            onChange={(e) => setNomDemo(e.target.value)}
            erreur={nomDemo.length === 1 ? 'Au moins 2 caractères' : undefined}
            aide="Tape une seule lettre pour voir l'erreur"
          />
          <ChampSelect
            libelle="Algorithme de classement"
            options={[
              { valeur: 'POINTS_BRUTS', libelle: 'Points bruts' },
              { valeur: 'POINTS_PONDERES', libelle: 'Points pondérés' },
            ]}
          />
          <div className="flex flex-col gap-2">
            <ChampJour libelle="Date de début" value={jour} onChange={(e) => setJour(e.target.value)} />
            <p className="text-xs text-text-mute">
              Envoyé au backend : <span data-testid="valeur-jour" className="font-mono">{jour || '—'}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <ChampDateHeure libelle="Date du match" valeurIso={instant} onChangerIso={setInstant} />
            <p className="text-xs text-text-mute">
              Envoyé au backend : <span data-testid="valeur-instant" className="font-mono">{instant ?? '—'}</span>
            </p>
          </div>
          <div className="col-span-2">
            <ChampZoneTexte libelle="Description" placeholder="Description du tournoi" />
          </div>
        </div>
      </Section>

      <Section id="section-onglets" titre="🗂️ Onglets">
        <Onglets libelle="Espace tournoi (démo)" onglets={ONGLETS_DEMO} actif={onglet} onChanger={setOnglet} />
        {ONGLETS_DEMO.map((o) =>
          o.id === onglet ? (
            <PanneauOnglet key={o.id} id={o.id}>
              <p className="text-sm">Contenu de l'onglet « {o.libelle} ». Flèches gauche/droite, Début et Fin au clavier.</p>
            </PanneauOnglet>
          ) : null,
        )}
      </Section>

      <Section id="section-ballon" titre="🏀 Ballon de rafraîchissement">
        <div className="flex items-center gap-6">
          <BoutonRafraichir enCours={demo.isFetching} onRafraichir={() => demo.refetch()} derniereMiseAJour={demo.dataUpdatedAt} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={requeteLente} onChange={(e) => setRequeteLente(e.target.checked)} />
            Requête lente (2,5 s)
          </label>
        </div>
        <p className="mt-3 text-sm text-text-mute">
          Requête rapide : le ballon tourne quand même 1,4 s. Requête lente : il continue jusqu'à la fin. Mouvement réduit détecté :{' '}
          <span data-testid="mouvement-reduit">{mouvementReduit ? 'oui' : 'non'}</span>
        </p>
      </Section>

      <Section id="section-format" titre="🔤 Formatage">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt className="text-text-mute">Jour (tournoi)</dt>
          <dd>{formaterJour('2027-06-01T00:00:00.000Z')}</dd>
          <dt className="text-text-mute">Date et heure (match, heure du Bénin)</dt>
          <dd>{formaterDateHeure('2027-08-05T17:00:00.000Z')}</dd>
          <dt className="text-text-mute">Âge</dt>
          <dd>{formaterAge(24)}</dd>
          <dt className="text-text-mute">Nombre</dt>
          <dd className="tabular-nums">{formaterNombre(12345)}</dd>
        </dl>
      </Section>
    </main>
  )
}
