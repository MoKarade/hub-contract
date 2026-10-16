# 01 — Principes non négociables

> Ancienne section de `CLAUDE.md`, déplacée ici le 16/10/2026 (tâche hub-contract#35). Le fichier racine garde l'essentiel (≤ 60 lignes).

- **Aucune dépendance runtime autre que `zod` (^3).** `tsup`, `vitest` et `typescript`
  restent en devDependencies. Ce paquet est installé par huit consommateurs (liste en §11) :
  chaque dépendance ajoutée est ajoutée huit fois.
  Exception encadrée (sous-chemin `/session`, vérification de la session partagée) : `jose` est une
  **peerDependency optionnelle**, pas une dépendance runtime. Le contrat (`.`) et `/endpoint` n'en
  importent rien ; seul `@mokarade/hub-contract/session` l'utilise, et les apps qui le lisent l'ont déjà.
- **Pas de logique métier, pas de composant UI, pas de fetch.** Un contrat décrit une forme ;
  il ne fait rien.
- **Aucun secret, aucune donnée.** Le jeton `x-hub-token` vit dans les variables
  d'environnement des consommateurs, jamais ici.
- **Jamais de breaking change sans bump de `CONTRACT_VERSION` ET nouveau tag majeur.**
  Est breaking : retirer ou renommer un champ, rendre requis un champ optionnel, restreindre
  une regex / un enum / une longueur, changer une sémantique.
- **Un changement additif optionnel ne casse personne, et c'est verrouillé par un test.**
  Les schémas strippent les clés inconnues au parse (défaut Zod) : un consommateur non
  re-pinné ignore simplement le nouveau champ. C'est ce qui rend l'évolution possible sans
  synchroniser tous les consommateurs le même jour.

  ⚠️ **Le revers**, et il a mordu : *strippé* veut dire **silencieux**. Une app épinglée sur
  un tag antérieur à un champ le perd sans erreur — pas de rejet, juste un bloc qui disparaît
  du summary. C'est pourquoi le README dit de ne jamais pinner `#v1.0.0`, antérieur à `usage`.
- **Toute modification du contrat exige un test qui la couvre** : un cas valide ET un cas
  rejeté. Un test qui ne vérifie que « ça ne lève pas » ne prouve rien — Zod strippe au lieu
  de rejeter, donc l'absence d'exception est compatible avec le champ jeté en silence.
  Comparer ce que `validateSummary` REND, pas seulement le fait qu'il rende.
