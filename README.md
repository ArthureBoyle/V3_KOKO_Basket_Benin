# V3_KOKO_Basket_Benin
Projet Basket V3

----------------------------------
         Pour PUSH               |
----------------------------------

cd ~/KOKO/V3_KOKO_Basket_Benin
git add backend
git status
→ vérifie que tout apparaît en vert, sous "Changes to be committed".

git diff --cached -- ':!backend/package-lock.json'
→ relis, surtout server.ts et reponses.ts en entier — ce sont les seuls vrais fichiers de code de ce commit.
  (le ':!backend/package-lock.json' exclut le lock file du diff : genere automatiquement,
  rien a y relire a la main, juste du bruit illisible)

git commit -m "TXT"
git push --dry-run
git push