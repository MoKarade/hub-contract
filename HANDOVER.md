# HANDOVER — hub-contract

## État du repo (v1.1.0)

- Contrat v1 complet dans `src/index.ts` : `CONTRACT_VERSION = 1`,
  `HUB_TOKEN_HEADER = "x-hub-token"`, schémas `HubMetric` / `HubAlert` /
  `HubAction` / `HubSummary`, helpers `validateSummary` et `buildingSummary`.
- **v1.1.0** : bloc `usage` (coûts & quotas), champ `.optional()` — additif,
  `CONTRACT_VERSION` inchangé (règle d'évolution n°2). Mergé sur `main`
  (`2d37a61`).
- `npm run build`, `npm run test` (38 tests) et `npm run typecheck` passent.
- Installabilité vérifiée depuis une install git (`prepare` → build → seul
  `dist/` livré) en CommonJS, ESM et projet Vite.
- Docs : `README.md` (contrat commenté, auth, CORS), `CLAUDE.md` (règles
  d'évolution).

## ✅ Le tag `v1.1.0` existe (2026-08-20)

Poussé par Marc, il pointe `3bbbf19` (tête de `main`). `package.json` annonce
`1.1.0` depuis le merge de #1 ; le tag et la version concordent enfin.

Pourquoi `3bbbf19` et non `2d37a61`, le SHA que les cinq dépôts épinglent : entre
les deux, `src/index.ts` n'a gagné **que des commentaires** — aucun changement de
schéma, version inchangée. Le tag désigne donc exactement le contrat déjà en
service. Les dépôts peuvent passer de `#2d37a61` à `#v1.1.0` au prochain re-pin,
sans urgence : les deux résolvent le même contrat.

⚠️ Pour mémoire, si un futur tag est nécessaire : **une session Claude ne peut pas
le pousser**. Le proxy git rend `HTTP 403` sur les refs de tag (vérifié le
2026-08-20, pas déduit), et les outils GitHub disponibles en session sont en
lecture seule pour les tags et les releases. C'est une commande sur le poste de
Marc, ou l'écran *Releases* de GitHub.

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
| BatchChef | `web/` (`lib/hubSummary.ts`) | idem |
| JobAI | racine (pinne le SHA `2d37a61`, faute de tag) | re-pinner `#v1.1.0` une fois le tag poussé |

*(BatchChef et JobAI manquaient à cette table — trouvé par l'audit de dette
inter-dépôts de JobAI, 2026-07-29. Toute nouvelle app consommatrice s'ajoute
ici ET dans la liste du `CLAUDE.md` §3, dans le même commit.)*

Un consommateur non re-pinné reste sur l'ancien tag : comportement voulu,
aucune urgence tant que le contrat qu'il utilise est encore servi par les apps.
