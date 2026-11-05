import { useRef, useState } from 'react'
import { CartePage } from '../../components/CartePage'
import { EnTetePage } from '../../components/EnTetePage'
import { Ballon } from '../../components/ui/Ballon'
import { Bouton } from '../../components/ui/Bouton'
import { SqueletteLignes } from '../../components/ui/Squelette'
import { useNotifier } from '../../components/notifications/contexte'
import { messageErreurApi } from '../../lib/erreurs'
import { formaterJour, formaterNomJoueur, urlImage } from '../../lib/format'
import { useMonProfil, useUploaderAvatar } from './api'

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
      <EnTetePage titre="Mon profil" description="Ton identité et ta photo." icone={<Ballon mode="arret" className="size-6" />} />

      <CartePage>
        {isLoading ? (
          <SqueletteLignes lignes={4} />
        ) : isError || !profil ? (
          <p role="alert" className="text-sm text-danger">
            {messageErreurApi(error)}
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-5">
              <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-elevated">
                {profil.avatar ? (
                  <img src={urlImage(profil.avatar)} alt="" className="size-full object-cover" />
                ) : (
                  <span className="text-xl font-medium text-text-mute">
                    {profil.prenom[0]}
                    {profil.nomLegal[0]}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-start gap-2">
                <input
                  ref={entreeFichier}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={choisirFichier}
                />
                <Bouton
                  variante="secondaire"
                  magnetique
                  onClick={() => entreeFichier.current?.click()}
                  disabled={uploader.isPending}
                >
                  {uploader.isPending ? 'Envoi…' : 'Changer la photo'}
                </Bouton>
                <p className="text-xs text-text-mute">JPEG, PNG ou WebP, 3 Mo maximum.</p>
              </div>
            </div>

            {erreur && (
              <p role="alert" className="text-sm text-danger">
                {erreur}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 border-t border-border pt-6 md:grid-cols-3">
              <div>
                <p className="text-2xs font-medium tracking-[0.08em] text-text-mute uppercase">Nom</p>
                <p className="mt-1 text-base font-medium">
                  {formaterNomJoueur({ nom: profil.nomLegal, prenom: profil.prenom, surnom: profil.surnom })}
                </p>
              </div>
              <div>
                <p className="text-2xs font-medium tracking-[0.08em] text-text-mute uppercase">Identifiant KOKO</p>
                <p className="mt-1 font-mono text-base font-medium">{profil.idKoko}</p>
              </div>
              <div>
                <p className="text-2xs font-medium tracking-[0.08em] text-text-mute uppercase">Date de naissance</p>
                <p className="mt-1 text-base font-medium">{formaterJour(profil.dateNaissance)}</p>
              </div>
            </div>
          </div>
        )}
      </CartePage>
    </section>
  )
}
