// ================================================
// REPONSES — une seule forme de reponse JSON, partout
// ================================================
// Convention posee AVANT la premiere route metier (voir echange
// precedent) : chaque route repond soit reponseSucces, soit
// reponseErreur — jamais un res.json({...}) ecrit a la main ailleurs.
//
// /health est volontairement exempte de cette convention : c'est un
// endpoint d'infrastructure (docker healthcheck, monitoring), pas une
// route metier — il garde une forme minimale a lui.

import { Response } from "express";

export function reponseSucces(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function reponseErreur(res: Response, message: string, status = 400) {
  return res.status(status).json({ success: false, error: message });
}
