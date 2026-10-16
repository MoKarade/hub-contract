# 09 — Leçons apprises

> Ancienne section de `CLAUDE.md`, déplacée ici le 16/10/2026 (tâche hub-contract#35). Le fichier racine garde l'essentiel (≤ 60 lignes).

**1. La règle de non-fusion des périodes doit vivre ICI, pas chez les consommateurs.** Le
hub somme les `cost` PAR période et refuse de fusionner « cumulé » et « ce mois-ci ».
Jusqu'au 20/08, cette règle n'était écrite que dans `app-template/CLAUDE.md` — le mauvais
dépôt. Pire, le commentaire de `HubUsageSchema` promettait l'inverse (« le hub agrège
`cost` de toutes les apps, total + par app »), donc un producteur qui lisait le contrat
croyait que sa période serait fondue dans un total unique. Elle ne l'était pas, et un
montant faux et sous-estimé s'est affiché en production sous l'étiquette « cumulé ».

**2. Une instruction d'installation périmée fait perdre un champ en silence.** Le README a
dit « toujours pinner `#v1.0.0` » après la sortie de la v1.1.0. Suivi à la lettre, ça
retirait `usage` du summary sans la moindre erreur.

**3. Un test de validité contractuelle doit comparer ce qui est RENDU.** Zod strippe : un
test qui vérifie seulement que `validateSummary` ne lève pas passe même quand le contrat
épinglé ne porte pas le champ testé.
