# 08 — Documentation (où vit quoi)

> Ancienne section de `CLAUDE.md`, déplacée ici le 16/10/2026 (tâche hub-contract#35). Le fichier racine garde l'essentiel (≤ 60 lignes).

| Fichier | Contenu |
|---|---|
| `README.md` | Le contrat champ par champ. **C'est la doc des producteurs** — un tableau qui manque là se paie en apps qui publient à côté. |
| `CLAUDE.md` | L'essentiel du dépôt, 60 lignes au plus ; le détail est dans `docs/claude/`. |
| `docs/claude/` | Ancien contenu long de `CLAUDE.md`, un fichier par ancienne section (index : `CLAUDE.md`, « Pour aller plus loin »). |
| `HANDOVER.md` | État des versions, des tags et des consommateurs. Procédure de release. |

⚠️ **Le README est la seule doc que lisent les apps consommatrices.** Le 20/08/2026, le bloc `usage`
existait dans le schéma depuis la v1.1.0 et le mot n'apparaissait **pas une seule fois** dans
le README : un producteur cherchant comment publier un coût n'avait aucun endroit où le lire.
Un champ ajouté au schéma sans sa ligne de README est un champ que personne n'utilisera.
