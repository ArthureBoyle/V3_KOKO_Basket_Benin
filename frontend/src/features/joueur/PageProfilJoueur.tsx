import { useRef, useState } from 'react'
import { CartePage } from '../../components/CartePage'
import { EnTetePage } from '../../components/EnTetePage'
import { SqueletteLignes } from '../../components/ui/Squelette'
import { useNotifier } from '../../components/notifications/contexte'
import { messageErreurApi } from '../../lib/erreurs'
import { formaterJour, formaterNomJoueur, urlImage } from '../../lib/format'
import { useMonProfil, useUploaderAvatar } from './api'

function LigneProfil({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-3.5 first:border-t">
      <dt className="text-sm text-text-mute">{libelle}</dt>
      <dd className="text-right font-medium break-words">{valeur}</dd>
    </div>
  )
}

// Identite en lecture seule (l'ADMIN certifie idKoko/nom/date de
// naissance a la creation du compte, voir features/comptes) : seule
// l'avatar appartient au joueur lui-meme, via PUT /joueurs/moi/avatar.
export function PageProfilJoueur() {
  const { data: profil, isLoading, isError, error } = useMonProfil()
  const uploader = useUploaderAvatar()
  const notifier = useNotifier()
  const [erreur, setErreur] = useState<string | null>(null)
  const entreeFichier = useRef<HTMLInputElement>(null)

  const choisirFichier = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    setErreur(null)
    uploader.mutate(fichier, {
      onSuccess: () => notifier('Photo de profil mise à jour', 'succes'),
      onError: (err) => setErreur(messageErreurApi(err)),
    })
  }

  return (
    <section className="flex flex-col gap-6">
      <EnTetePage
        titre="Mon profil"
        description="Ton identité et ta photo."
      />

      {isLoading ? (
        <CartePage>
          <SqueletteLignes lignes={4} />
        </CartePage>
      ) : isError || !profil ? (
        <CartePage>
          <p role="alert" className="text-sm text-danger">
            {messageErreurApi(error)}
          </p>
        </CartePage>
      ) : (
        // Carte de joueur : bandeau teinte, photo qui chevauche le bandeau,
        // nom centre, identifiant en "badge", puis une liste propre
        // (libelle a gauche, valeur a droite) plutot que des blocs.
        <div className="mx-auto w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface">
          <div className="h-24 bg-gradient-to-b from-primary/30 to-transparent" />

          <div className="-mt-14 flex flex-col items-center px-6 pb-8">
            <input
              ref={entreeFichier}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={choisirFichier}
            />
            <button
              type="button"
              onClick={() => entreeFichier.current?.click()}
              disabled={uploader.isPending}
              aria-label="Changer la photo de profil"
              className="group relative size-28 rounded-full disabled:cursor-wait"
            >
              <span className="flex size-full items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-elevated ring-4 ring-surface">
                {profil.avatar ? (
                  <img src={urlImage(profil.avatar)} alt="" className="size-full object-cover" />
                ) : (
                  <span className="text-3xl font-medium text-text-mute">
                    {profil.prenom[0]}
                    {profil.nomLegal[0]}
                  </span>
                )}
              </span>
              <span
                aria-hidden="true"
                className="absolute right-0 bottom-0 flex size-9 items-center justify-center rounded-full border-2 border-surface bg-primary text-on-primary transition-transform duration-150 group-hover:scale-110"
              >
                {uploader.isPending ? (
                  <span className="text-2xs">…</span>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                    <circle cx="12" cy="13" r="3.5" />
                  </svg>
                )}
              </span>
            </button>

            <h2 className="mt-4 text-center text-2xl font-semibold break-words">
              {formaterNomJoueur({
                nom: profil.nomLegal,
                prenom: profil.prenom,
                surnom: profil.surnom,
              })}
            </h2>
            <span className="mt-2 rounded-md border border-border bg-elevated px-3 py-1 font-mono text-sm tracking-[0.12em] text-primary-text">
              {profil.idKoko}
            </span>
            <p className="mt-3 text-xs text-text-mute">
              Touche la photo pour la changer · JPEG, PNG ou WebP, 3 Mo max.
            </p>

            {erreur && (
              <p role="alert" className="mt-3 text-center text-sm text-danger">
                {erreur}
              </p>
            )}

            <dl className="mt-8 w-full">
              <LigneProfil libelle="Prénom" valeur={profil.prenom} />
              <LigneProfil libelle="Nom" valeur={profil.nomLegal} />
              {profil.surnom && <LigneProfil libelle="Surnom" valeur={profil.surnom} />}
              <LigneProfil libelle="Naissance" valeur={formaterJour(profil.dateNaissance)} />
            </dl>
          </div>
        </div>
      )}
    </section>
  )
}
