import { useState } from 'react'
import { useNotifier } from '../../components/notifications/contexte'
import { Bouton } from '../../components/ui/Bouton'

interface Champ {
  libelle: string
  valeur: string
}

interface IdentifiantsGeneresProps {
  message: string
  champs: readonly Champ[]
  onFermer: () => void
}

// Affichage UNIQUE des identifiants generes par le serveur (creation de
// compte, nouveau mot de passe) : une fois cette fenetre fermee, plus
// personne ne peut les retrouver — meme pas l'admin.
export function IdentifiantsGeneres({ message, champs, onFermer }: IdentifiantsGeneresProps) {
  const notifier = useNotifier()
  const [copie, setCopie] = useState(false)

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(champs.map((c) => c.valeur).join(' / '))
      setCopie(true)
      notifier('Identifiants copiés', 'info')
    } catch {
      notifier("Impossible de copier automatiquement : recopie les valeurs à la main", 'erreur')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-mute">{message}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 rounded-md border border-border bg-elevated p-4 text-sm">
        {champs.map((champ) => (
          <div key={champ.libelle} className="contents">
            <dt className="text-text-mute">{champ.libelle}</dt>
            <dd className="font-mono">{champ.valeur}</dd>
          </div>
        ))}
      </dl>
      <div className="flex justify-end gap-3">
        <Bouton variante="secondaire" onClick={copier}>
          {copie ? 'Copié ✓' : 'Copier'}
        </Bouton>
        <Bouton onClick={onFermer}>Fermer</Bouton>
      </div>
    </div>
  )
}
