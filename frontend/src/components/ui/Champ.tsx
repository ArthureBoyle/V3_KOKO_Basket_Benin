import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { heureBeninVersIso, isoVersHeureBenin } from '../../lib/format'

const CLASSES_SAISIE =
  'rounded-md border border-border bg-elevated px-3 py-2 text-base text-text placeholder:text-text-mute aria-[invalid=true]:border-danger'

interface CommunChamp {
  libelle: string
  erreur?: string
  aide?: string
}

// Libelle relie au champ, aide et erreur annoncees par les lecteurs d'ecran
// (aria-describedby), champ en erreur signale (aria-invalid).
function EnveloppeChamp({ libelle, erreur, aide, idChamp, children }: CommunChamp & { idChamp: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={idChamp} className="text-sm font-medium">
        {libelle}
      </label>
      {children}
      {aide && !erreur && (
        <p id={`${idChamp}-aide`} className="text-xs text-text-mute">
          {aide}
        </p>
      )}
      {erreur && (
        <p id={`${idChamp}-erreur`} className="text-xs text-danger">
          {erreur}
        </p>
      )}
    </div>
  )
}

function accessibilite(idChamp: string, erreur?: string, aide?: string) {
  return {
    'aria-invalid': erreur ? true : undefined,
    'aria-describedby': erreur ? `${idChamp}-erreur` : aide ? `${idChamp}-aide` : undefined,
  }
}

type ChampProps = CommunChamp & InputHTMLAttributes<HTMLInputElement>

export function Champ({ libelle, erreur, aide, id, className = '', ...props }: ChampProps) {
  const idGenere = useId()
  const idChamp = id ?? idGenere
  return (
    <EnveloppeChamp libelle={libelle} erreur={erreur} aide={aide} idChamp={idChamp}>
      <input id={idChamp} className={`${CLASSES_SAISIE} ${className}`} {...accessibilite(idChamp, erreur, aide)} {...props} />
    </EnveloppeChamp>
  )
}

// Jour calendaire : la valeur est deja "YYYY-MM-DD", le format du backend.
export function ChampJour(props: Omit<ChampProps, 'type'>) {
  return <Champ type="date" {...props} />
}

interface ChampDateHeureProps
  extends CommunChamp,
    Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'defaultValue' | 'onChange'> {
  valeurIso: string | null
  onChangerIso: (iso: string | null) => void
}

// Date + heure d'un match : saisie a l'heure du Benin, valeur rendue en ISO
// avec fuseau ("2027-08-05T18:00:00+01:00"), le format exige par le backend.
export function ChampDateHeure({ libelle, erreur, aide, valeurIso, onChangerIso, id, className = '', ...props }: ChampDateHeureProps) {
  const idGenere = useId()
  const idChamp = id ?? idGenere
  const texteAide = aide ?? 'Heure du Bénin (UTC+1)'
  return (
    <EnveloppeChamp libelle={libelle} erreur={erreur} aide={texteAide} idChamp={idChamp}>
      <input
        id={idChamp}
        type="datetime-local"
        value={valeurIso ? isoVersHeureBenin(valeurIso) : ''}
        onChange={(e) => onChangerIso(e.target.value ? heureBeninVersIso(e.target.value) : null)}
        className={`${CLASSES_SAISIE} ${className}`}
        {...accessibilite(idChamp, erreur, texteAide)}
        {...props}
      />
    </EnveloppeChamp>
  )
}

interface ChampSelectProps extends CommunChamp, SelectHTMLAttributes<HTMLSelectElement> {
  options: readonly { valeur: string; libelle: string }[]
}

export function ChampSelect({ libelle, erreur, aide, options, id, className = '', ...props }: ChampSelectProps) {
  const idGenere = useId()
  const idChamp = id ?? idGenere
  return (
    <EnveloppeChamp libelle={libelle} erreur={erreur} aide={aide} idChamp={idChamp}>
      <select id={idChamp} className={`${CLASSES_SAISIE} ${className}`} {...accessibilite(idChamp, erreur, aide)} {...props}>
        {options.map((option) => (
          <option key={option.valeur} value={option.valeur}>
            {option.libelle}
          </option>
        ))}
      </select>
    </EnveloppeChamp>
  )
}

type ChampZoneTexteProps = CommunChamp & TextareaHTMLAttributes<HTMLTextAreaElement>

export function ChampZoneTexte({ libelle, erreur, aide, id, className = '', rows = 4, ...props }: ChampZoneTexteProps) {
  const idGenere = useId()
  const idChamp = id ?? idGenere
  return (
    <EnveloppeChamp libelle={libelle} erreur={erreur} aide={aide} idChamp={idChamp}>
      <textarea id={idChamp} rows={rows} className={`${CLASSES_SAISIE} ${className}`} {...accessibilite(idChamp, erreur, aide)} {...props} />
    </EnveloppeChamp>
  )
}
