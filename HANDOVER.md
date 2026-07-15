# HANDOVER — hub-contract

## État du repo (v1.0.0)

- Contrat v1 complet dans `src/index.ts` : `CONTRACT_VERSION = 1`,
  `HUB_TOKEN_HEADER = "x-hub-token"`, schémas `HubMetric` / `HubAlert` /
  `HubAction` / `HubSummary`, helpers `validateSummary` et `buildingSummary`.
- `npm run build`, `npm run test` (34 tests) et `npm run typecheck` passent.
- Installabilité vérifiée depuis une install git (`prepare` → build → seul
  `dist/` livré) en CommonJS, ESM et projet Vite.
- Docs : `README.md` (contrat commenté, auth, CORS), `CLAUDE.md` (règles
  d'évolution).

## Comment tagger une release

```bash
# 1. S'assurer que tout passe
npm run build && npm run test && npm run typecheck

# 2. Synchroniser la version (package.json + tag identiques)
#    breaking → bump CONTRACT_VERSION dans src/index.ts + version majeure
#    additif optionnel → version mineure, CONTRACT_VERSION inchangé
npm version 1.1.0 --no-git-tag-version
git add package.json package-lock.json && git commit -m "chore: release v1.1.0"

# 3. Tag annoté + push
git tag -a v1.1.0 -m "hub-contract v1.1.0"
git push origin <branche> && git push origin v1.1.0
```

## Consommateurs à re-pinner après chaque release

| Consommateur | Où | Action |
|---|---|---|
| FinanceAI | `mcp/` | `npm install github:MoKarade/hub-contract#vX.Y.Z` |
| DriveAI | `api/` | idem |
| Hub | dashboard `hubperso.com` | idem |
| app-template | template des futures apps | idem |

Un consommateur non re-pinné reste sur l'ancien tag : comportement voulu,
aucune urgence tant que le contrat qu'il utilise est encore servi par les apps.
