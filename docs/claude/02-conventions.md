# 02 — Conventions de code

> Ancienne section de `CLAUDE.md`, déplacée ici le 16/10/2026 (tâche hub-contract#35). Le fichier racine garde l'essentiel (≤ 60 lignes).

- **TypeScript strict**, pas de `any` silencieux.
- **Erreurs honnêtes** : `validateSummary` liste toutes les issues Zod, il n'en avale aucune.
- **Pas de fake data** : une app sans moteur actif renvoie `buildingSummary(...)`, jamais des
  chiffres inventés. Le contrat porte `status: "building"` précisément pour ça.
- Les commentaires des schémas sont de la **documentation pour les producteurs** — ce sont
  eux qu'on lit en écrivant une app. Ce qui y est écrit doit être vrai côté hub.
