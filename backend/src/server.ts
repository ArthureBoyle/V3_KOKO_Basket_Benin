// ================================================
// SERVER.TS — point d'entree reel : importe l'app, l'ecoute sur un port
// ================================================
import app from "./app";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`KOKO V3 backend lance sur http://localhost:${PORT}`);
});
