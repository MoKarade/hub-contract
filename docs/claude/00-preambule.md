# Préambule — ce que ce dépôt est

> Ancien en-tête de `CLAUDE.md`, déplacé ici le 16/10/2026 (tâche hub-contract#35).

**Source de vérité** du contrat d'intégration hub ↔ apps (`GET .../hub/summary`). Ce dépôt
ne contient QUE le contrat : schémas Zod, types TypeScript, deux helpers
(`validateSummary`, `buildingSummary`), tests, docs.

**Stack** : TypeScript · Zod 3 · tsup · Vitest.
**Distribution** : installé depuis GitHub par tag, jamais publié sur npm. **`dist/` est commité**
(depuis v1.3.1) : toute modification de `src/` se committe avec son `dist/` reconstruit, la CI
rougit sinon.

> 📐 Structure de ce fichier : [convention commune aux huit dépôts](https://github.com/MoKarade/claude-config/blob/main/conventions/STRUCTURE-DEPOT.md).
> Les sections 6 et 7 y sont **omises** : ce dépôt ne se déploie pas et ne s'intègre à
> aucun hub — il *est* le contrat. Le saut de numérotation est le signe qu'elles n'existent
> pas ici, pas un oubli.
