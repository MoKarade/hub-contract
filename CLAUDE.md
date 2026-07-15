# CLAUDE.md — hub-contract

Ce repo est la **source de vérité** du contrat d'intégration hub ↔ apps
(`GET .../hub/summary`). Il ne contient QUE le contrat : schémas Zod, types
TypeScript, deux helpers (`validateSummary`, `buildingSummary`), tests, docs.

## Interdits

- Aucune dépendance runtime autre que `zod` (^3). `tsup`, `vitest`,
  `typescript` restent en devDependencies.
- Pas de logique métier, pas de composants UI, pas de fetch.
- Aucun secret, aucune donnée. Le token d'auth (`x-hub-token`) vit dans les
  variables d'environnement des consommateurs, jamais ici.

## Règles d'évolution du contrat

1. **Jamais de breaking change sans bump de `CONTRACT_VERSION` et nouveau
   tag.** Est breaking : retirer/renommer un champ, rendre requis un champ
   optionnel, restreindre une regex/enum/longueur, changer une sémantique.
   Procédure : bump `CONTRACT_VERSION` dans `src/index.ts`, bump majeur dans
   `package.json` (ex: `2.0.0`), nouveau tag `v2.0.0`.
2. **Changement additif optionnel = tag mineur.** Un nouveau champ `.optional()`
   (ou un nouvel élément d'enum accepté en plus) ne casse aucun consommateur :
   pas de bump de `CONTRACT_VERSION`, version mineure dans `package.json`
   (ex: `1.1.0`), tag `v1.1.0`. Ça fonctionne parce que les schémas strippent
   les clés inconnues au parse (comportement Zod par défaut, verrouillé par un
   test) : un consommateur non re-pinné ignore simplement le nouveau champ.
3. **Après tout changement, rappeler dans HANDOVER.md quels consommateurs
   re-pinner** :
   - FinanceAI (`mcp/`)
   - DriveAI (`api/`)
   - Hub (dashboard `hubperso.com`)
   - app-template
   Chacun pinne un tag précis (`npm install github:MoKarade/hub-contract#vX.Y.Z`) ;
   tant qu'il n'est pas re-pinné, il reste sur l'ancien contrat — c'est voulu.

## Vérifications avant tout commit

```bash
npm run build && npm run test && npm run typecheck
```

Les trois doivent passer. Toute modification du contrat exige un test qui la
couvre (cas valide + cas rejeté).

## Procédure de release

Voir [HANDOVER.md](./HANDOVER.md). En résumé : versions synchronisées entre
`package.json` et le tag git, tag annoté `vX.Y.Z` poussé sur GitHub, puis
re-pin des consommateurs.

## Rappels de style (hérités du CLAUDE.md global de Marc)

- Réponses, commits et docs **en français** (`feat:`, `fix:`, `docs:`, ...).
- TypeScript strict, pas de `any` silencieux.
- Erreurs honnêtes : `validateSummary` liste toutes les issues Zod, il ne les
  avale jamais.
- Pas de fake data : une app sans moteur actif renvoie `buildingSummary(...)`,
  pas des chiffres inventés.
