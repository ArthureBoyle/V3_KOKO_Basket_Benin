import { Link } from 'react-router'
import { Badge } from '../../components/ui/Badge'
import { BlocInfo } from '../../components/ui/BlocInfo'
import { CarteStatut } from '../../components/ui/CarteStatut'
import { formaterAge } from '../../lib/format'
import type { Compte } from '../../types/api'

// Mobile : le grand rectangle est le lien vers la fiche du compte, ses
// infos sont rangees en petits blocs etiquetes (comme les cartes de tournoi).
export function CartesComptes({ comptes }: { comptes: Compte[] }) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {comptes.map((c) => (
        <li key={c.id}>
          <Link to={`/admin/comptes/${c.id}`} className="block">
            <CarteStatut ton={c.actif ? 'succes' : 'danger'}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg leading-tight font-semibold break-words">
                    {c.prenom} {c.nom}
                  </p>
                  {c.joueur?.surnom && <p className="mt-0.5 text-sm text-text-mute">« {c.joueur.surnom} »</p>}
                </div>
                {c.actif ? <Badge ton="succes">Actif</Badge> : <Badge ton="danger">Désactivé</Badge>}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {c.joueur ? (
                  <BlocInfo libelle="ID KOKO">
                    <span className="font-mono text-xs">{c.joueur.idKoko}</span>
                  </BlocInfo>
                ) : (
                  <div className="col-span-2">
                    <BlocInfo libelle="Email KOKO">
                      <span className="font-mono text-xs">{c.email}</span>
                    </BlocInfo>
                  </div>
                )}
                {c.joueur && <BlocInfo libelle="Âge">{formaterAge(c.joueur.age)}</BlocInfo>}
                <BlocInfo libelle="Tournois">
                  <span className="tabular-nums">{c.tournois.length}</span>
                </BlocInfo>
              </div>
            </CarteStatut>
          </Link>
        </li>
      ))}
    </ul>
  )
}
