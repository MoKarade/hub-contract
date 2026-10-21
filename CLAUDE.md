# CLAUDE.md — hub-contract

## Contexte
- **Source de vérité** du contrat d'intégration hub ↔ apps (`GET .../hub/summary`). Ce dépôt ne contient QUE le contrat : schémas Zod, types TypeScript, deux helpers (`validateSummary`, `buildingSummary`), tests, docs.
- Stack : TypeScript · Zod 4 · tsup · Vitest. Installé depuis GitHub par tag, jamais publié sur npm. **`dist/` est commité** (depuis v1.3.1) : toute modification de `src/` se committe avec son `dist/` reconstruit, la CI rougit sinon.
- Consommateurs (huit) : Hubperso · FinanceAI (`mcp/`) · DriveAI (`api/`) · BatchChef (`web/`) · JobAI · MemoryAI · CarAI · app-template. Liste complète et re-pin : `HANDOVER.md`.
- Pas de sections 6 et 7 : ce dépôt ne se déploie pas et ne s'intègre à aucun hub, il *est* le contrat.
- État : `HANDOVER.md` (à lire en premier) ; plan : les issues GitHub du dépôt.

## Commandes
- `npm run build` (tsup → `dist/`) · `npm run test` (vitest) · `npm run typecheck` (`tsc --noEmit`) · `npm run portes` (cliquet, `qualite/`).
- Gate avant commit : `npm run build && npm run test && npm run typecheck`. Détail : `docs/claude/04-commandes.md`, `05-verifications.md`.

## Règles propres au dépôt (détail : `docs/claude/01-principes.md`)
- **Une seule dépendance runtime : `zod` (^4).** `tsup`, `vitest`, `typescript` restent en devDependencies. Exception encadrée : `jose`, peerDependency OPTIONNELLE, seulement pour le sous-chemin `/session`.
- **Pas de logique métier, pas de composant UI, pas de fetch.** Aucun secret, aucune donnée : `x-hub-token` vit chez les consommateurs.
- **Jamais de breaking change sans bump de `CONTRACT_VERSION` ET nouveau tag majeur.** Est breaking : retirer ou renommer un champ, rendre requis un champ optionnel, restreindre une regex / un enum / une longueur, changer une sémantique.
- **Un changement additif optionnel ne casse personne** (les schémas strippent les clés inconnues), mais ⚠️ *strippé* veut dire **silencieux** : une app pinnée sur un vieux tag perd le champ sans erreur. Ne jamais pinner `#v1.0.0` (antérieur à `usage`).
- **Toute modification du contrat exige un test valide ET un test rejeté**, et un test compare ce que `validateSummary` REND, pas seulement qu'il ne lève pas.
- **Pas de fake data** : une app sans moteur actif renvoie `buildingSummary(...)`. Les commentaires des schémas documentent les producteurs : ils doivent être vrais côté hub.
- **Le README est la seule doc des apps consommatrices** : un champ ajouté au schéma sans sa ligne de README est un champ que personne n'utilisera.
- **Règle des périodes** : le hub somme les `cost` PAR période et ne fusionne jamais « cumulé » et « ce mois-ci » (`docs/claude/09-lecons.md`).
- TypeScript strict, pas de `any` silencieux, erreurs jamais avalées (`validateSummary` liste toutes les issues Zod).

## Git et CI
- Branches `claude/<slug>`, commits en français préfixés (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`), PR en brouillon, `--base main` explicite. `git fetch origin main` avant de committer. Jamais `--force` sur `main`, jamais `--no-verify`.
- Mergify fusionne en squash une PR sortie du brouillon quand les contrôles sont verts. Un chemin protégé (`.github/`, `scripts/hooks/`, `qualite/`, `vercel.json`, `drizzle/`, `.env*`) passe aussi quand le « Garde-fou » est vert ; rouge, il attend Marc (issue `qui:marc`).
- ⚠️ **Une session ne peut PAS pousser de tag** (proxy git : HTTP 403 sur les refs de tag). Marc pose le tag annoté `vX.Y.Z` : procédure dans `docs/claude/11-release.md`.
- Un check requis n'a JAMAIS de `paths:`. Jobs CI bornés (`timeout-minutes`).

## Pour aller plus loin (à lire seulement si nécessaire)
Ancien numéro de section de ce fichier → `docs/claude/` :
- § 1 principes → `01-principes` · § 2 conventions → `02-conventions` · § 3 git → `03-workflow-git` · § 4 commandes → `04-commandes` · § 5 vérifications → `05-verifications`
- § 8 documentation → `08-documentation` · § 9 leçons → `09-lecons` · § 10 style et compte-rendu → `10-style-compte-rendu` · § 11 release → `11-release` · en-tête → `00-preambule`
- Graphe de code (hooks et MCP `graphify` posés, 0 jeton ; `scripts/graphe.sh query|affected|path|explain` avant de grepper) → `12-graphe-code`
- Copie lisible de la convention de compte-rendu : `docs/COMPTE-RENDU.md` (non importée ; sa synchro reste vérifiée par la CI). Règles de forme : instructions du projet « Apps ».
