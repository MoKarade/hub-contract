# 03 — Workflow git

> Ancienne section de `CLAUDE.md`, déplacée ici le 16/10/2026 (tâche hub-contract#35). Le fichier racine garde l'essentiel (≤ 60 lignes).

- Branches `claude/<slug>`, commits en français préfixés, **PR en draft**.
- ❌ Jamais `--force` sur `main`. ❌ Jamais `--no-verify`.
- ⚠️ `git fetch origin main` avant de committer.
- ⚠️ **Une session Claude ne peut PAS pousser de tag.** Le proxy git rend `HTTP 403` sur les
  refs de tag (vérifié le 20/08/2026 en essayant, pas déduit), et les outils GitHub
  disponibles en session sont en lecture seule pour les tags et les releases. Le tag est une
  commande sur le poste de Marc, ou l'écran *Releases* de GitHub.
