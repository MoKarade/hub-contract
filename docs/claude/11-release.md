# 11 — Procédure de release

> Ancienne section de `CLAUDE.md`, déplacée ici le 16/10/2026 (tâche hub-contract#35). Le fichier racine garde l'essentiel (≤ 60 lignes).

1. Le changement est mergé sur `main`, gate vert — `dist/` reconstruit et commité avec lui.
2. `package.json` porte la bonne version — **majeure** si breaking (avec bump de
   `CONTRACT_VERSION` dans `src/index.ts`), **mineure** si additif optionnel.
3. **Marc pousse le tag annoté** `vX.Y.Z` (une session ne peut pas, cf. §3) :
   ```bash
   git fetch origin main
   git tag -a vX.Y.Z <sha> -m "hub-contract vX.Y.Z — <résumé>"
   git push origin vX.Y.Z
   ```
   Ou : GitHub → *Releases* → *Draft a new release* → *Create new tag on publish*.
4. `HANDOVER.md` note **quels consommateurs re-pinner**. Ils le font à leur rythme : tant
   qu'un dépôt n'est pas re-pinné il reste sur l'ancien contrat, et **c'est voulu**.

**Les consommateurs** : Hubperso (dashboard) · FinanceAI (`mcp/`) · DriveAI (`api/`) ·
BatchChef (`web/`) · JobAI (racine) · MemoryAI · CarAI · app-template.
