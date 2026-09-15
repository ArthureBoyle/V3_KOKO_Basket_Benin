import { useState } from 'react'
import { useParams } from 'react-router'
import { ApiError } from '../../api/client'
import { CartePage } from '../../components/CartePage'
import { EnTetePage } from '../../components/EnTetePage'
import { useNotifier } from '../../components/notifications/contexte'
import { BadgeStatutTournoi } from '../../components/ui/Badge'
import { Ballon } from '../../components/ui/Ballon'
import { Bouton } from '../../components/ui/Bouton'
import { CarteStatut } from '../../components/ui/CarteStatut'
import { DialogueCodeAdmin } from '../../components/ui/DialogueCodeAdmin'
import { EtatVide } from '../../components/ui/EtatVide'
import { LienRetour } from '../../components/ui/LienRetour'
import { SqueletteLignes } from '../../components/ui/Squelette'
import { messageErreurApi } from '../../lib/erreurs'
import { formaterAge, formaterJour, formaterNombre } from '../../lib/format'
import { DialogueModifierIdentite } from './DialogueModifierIdentite'
import { DialogueReinitialiserMotDePasse } from './DialogueReinitialiserMotDePasse'
import { useCompte, useDesactiverCompte, useReactiverCompte } from './api'

function urlAvatar(chemin: string): string {
  return `${import.meta.env.VITE_API_URL}/uploads/${chemin}`
}

function Champ({ libelle, children }: { libelle: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-2xs font-medium tracking-[0.08em] text-text-mute uppercase">{libelle}</dt>
      <dd className="mt-1 text-base">{children}</dd>
    </div>
  )
}

function StatChiffre({ libelle, valeur }: { libelle: string; valeur: number }) {
  return (
    <div className="rounded-lg border border-border bg-elevated px-4 py-3 text-center">
      <p className="text-2xl font-medium tabular-nums">{formaterNombre(valeur)}</p>
      <p className="mt-1 text-2xs tracking-[0.08em] text-text-mute uppercase">{libelle}</p>
    </div>
  )
}

// Bouton unique qui bascule le statut (un clic suffit), plutot qu'un badge
// + un lien texte a cote : le badge devient lui-meme l'action. Pendant la
// requete, un calque se remplit de gauche a droite (.koko-remplissage) —
// remplace le couple disabled/"Verification…" utilise ailleurs, plus
// visible pour une action aussi frequente que desactiver/reactiver.
function BoutonStatut({
  actif,
  enAttente,
  onClick,
}: {
  actif: boolean
  enAttente: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={enAttente}
      className={`relative isolate inline-flex items-center gap-1.5 overflow-hidden rounded-full border px-3 py-1 text-2xs font-medium whitespace-nowrap transition-colors duration-150 disabled:cursor-wait ${
        actif
          ? 'border-success/30 bg-success/12 text-success hover:bg-success/20'
          : 'border-danger/30 bg-danger/12 text-danger hover:bg-danger/20'
      }`}
    >
      {enAttente && (
        <span
          aria-hidden="true"
          className={`koko-remplissage absolute inset-0 -z-10 ${actif ? 'bg-success/25' : 'bg-danger/25'}`}
        />
      )}
      {actif ? 'Actif' : 'Désactivé'}
    </button>
  )
}

export function FicheCompte() {
  const { id } = useParams()
  const compteId = Number(id)
  const { data: compte, isLoading, isError, error } = useCompte(compteId)
  const notifier = useNotifier()

  const [modificationOuverte, setModificationOuverte] = useState(false)
  const [motDePasseOuvert, setMotDePasseOuvert] = useState(false)
  const [desactivationOuverte, setDesactivationOuverte] = useState(false)

  const desactiver = useDesactiverCompte(compteId)
  const reactiver = useReactiverCompte()

  if (isLoading) {
    return (
      <section>
        <SqueletteLignes lignes={6} />
      </section>
    )
  }

  if (isError || !compte) {
    const introuvable = error instanceof ApiError && error.status === 404
    return (
      <section>
        <EtatVide
          titre={introuvable ? 'Compte introuvable' : 'Erreur'}
          description={introuvable ? "Ce compte n'existe plus, ou a été supprimé." : messageErreurApi(error)}
          action={
            <Bouton variante="secondaire" onClick={() => history.back()}>
              Retour
            </Bouton>
          }
        />
      </section>
    )
  }

  const estJoueur = compte.joueur !== null

  return (
    <section className="flex flex-col gap-4">
      <LienRetour to="/admin/comptes">Retour aux comptes</LienRetour>

      <CartePage>
        <EnTetePage
          titre={`${compte.prenom} ${compte.nom}${compte.joueur?.surnom ? ` « ${compte.joueur.surnom} »` : ''}`}
          description={estJoueur ? compte.joueur!.idKoko : compte.email}
          icone={
            estJoueur && compte.joueur!.avatar ? (
              <img
                src={urlAvatar(compte.joueur!.avatar)}
                alt=""
                className="size-full rounded-lg object-cover"
              />
            ) : (
              <Ballon mode="arret" className="size-6" />
            )
          }
          actions={
            <Bouton variante="secondaire" onClick={() => setModificationOuverte(true)}>
              Modifier l'identité
            </Bouton>
          }
        />

        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <Champ libelle="Email KOKO">
            <span className="font-mono text-sm">{compte.email}</span>
          </Champ>
          <Champ libelle="Email réel">
            <span className="truncate">{compte.emailReel ?? '—'}</span>
          </Champ>
          {estJoueur && (
            <Champ libelle="Âge">
              <span className="tabular-nums">{formaterAge(compte.joueur!.age)}</span>
            </Champ>
          )}
          <Champ libelle="Statut">
            <BoutonStatut
              actif={compte.actif}
              enAttente={reactiver.isPending || desactiver.isPending}
              onClick={() =>
                compte.actif
                  ? setDesactivationOuverte(true)
                  : reactiver.mutate(compteId, { onSuccess: () => notifier('Compte réactivé', 'succes') })
              }
            />
          </Champ>
        </div>

        <div className="mt-6">
          <Bouton variante="secondaire" onClick={() => setMotDePasseOuvert(true)}>
            Réinitialiser le mot de passe
          </Bouton>
        </div>
      </CartePage>

      {estJoueur && (
        <CartePage>
          <h2 className="mb-4 text-xl font-medium">Statistiques toutes compétitions</h2>
          {compte.statsGlobales!.matchsJoues === 0 ? (
            <EtatVide titre="Aucun match terminé" description="Les statistiques apparaîtront après son premier match." />
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <StatChiffre libelle="Matchs joués" valeur={compte.statsGlobales!.matchsJoues} />
              <StatChiffre libelle="Points (moy.)" valeur={compte.statsGlobales!.moyennePts} />
              <StatChiffre libelle="Fautes (moy.)" valeur={compte.statsGlobales!.moyenneFautes} />
              <StatChiffre libelle="Contres (moy.)" valeur={compte.statsGlobales!.moyenneContres} />
              <StatChiffre libelle="Temps de jeu (moy.)" valeur={compte.statsGlobales!.moyenneTempsJeu} />
            </div>
          )}
        </CartePage>
      )}

      <CartePage>
        <h2 className="mb-4 text-xl font-medium">
          {estJoueur ? 'Tournois où il est certifié' : 'Tournois attribués'}
        </h2>
        {compte.tournois.length === 0 ? (
          <EtatVide titre="Aucun tournoi" />
        ) : (
          <div className="flex flex-col gap-2.5">
            {estJoueur
              ? compte.tournois.map((inscription) => (
                  <CarteStatut key={inscription.tournoi.id} ton="primaire">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{inscription.tournoi.nom}</p>
                        <p className="text-sm text-text-mute">
                          {formaterJour(inscription.tournoi.dateDebut)} – {formaterJour(inscription.tournoi.dateFin)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-text-mute">
                          {inscription.equipe
                            ? `${inscription.equipe.nom} · #${inscription.equipe.numeroDeMaillot}`
                            : "Pas encore d'équipe"}
                        </span>
                        <BadgeStatutTournoi statut={inscription.tournoi.statut} />
                      </div>
                    </div>
                  </CarteStatut>
                ))
              : compte.tournois.map((tournoi) => (
                  <CarteStatut key={tournoi.id} ton="primaire">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{tournoi.nom}</p>
                        <p className="text-sm text-text-mute">
                          {formaterJour(tournoi.dateDebut)} – {formaterJour(tournoi.dateFin)}
                        </p>
                      </div>
                      <BadgeStatutTournoi statut={tournoi.statut} />
                    </div>
                  </CarteStatut>
                ))}
          </div>
        )}
      </CartePage>

      <DialogueModifierIdentite
        compte={compte}
        ouvert={modificationOuverte}
        onFermer={() => setModificationOuverte(false)}
      />
      <DialogueReinitialiserMotDePasse
        compteId={compteId}
        ouvert={motDePasseOuvert}
        onFermer={() => setMotDePasseOuvert(false)}
      />
      <DialogueCodeAdmin
        ouvert={desactivationOuverte}
        onFermer={() => setDesactivationOuverte(false)}
        titre="Désactiver ce compte ?"
        description="Le compte ne pourra plus se connecter tant qu'il n'est pas réactivé."
        libelleConfirmation="Désactiver"
        onConfirmer={async (codeAdmin) => {
          await desactiver.mutateAsync(codeAdmin)
          notifier('Compte désactivé', 'succes')
        }}
      />
    </section>
  )
}
