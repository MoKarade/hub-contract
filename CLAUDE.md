# CLAUDE.md — hub-contract

**Source de vérité** du contrat d'intégration hub ↔ apps (`GET .../hub/summary`). Ce dépôt
ne contient QUE le contrat : schémas Zod, types TypeScript, deux helpers
(`validateSummary`, `buildingSummary`), tests, docs.

**Stack** : TypeScript · Zod 3 · tsup · Vitest.
**Distribution** : installé depuis GitHub par tag, jamais publié sur npm.

> 📐 Structure de ce fichier : [convention commune aux huit dépôts](https://github.com/MoKarade/claude-config/blob/main/conventions/STRUCTURE-DEPOT.md).
> Les sections 6 et 7 y sont **omises** : ce dépôt ne se déploie pas et ne s'intègre à
> aucun hub — il *est* le contrat. Le saut de numérotation est le signe qu'elles n'existent
> pas ici, pas un oubli.

## 1. Principes non négociables

- **Aucune dépendance runtime autre que `zod` (^3).** `tsup`, `vitest` et `typescript`
  restent en devDependencies. Ce paquet est installé par six consommateurs : chaque
  dépendance ajoutée est ajoutée six fois.
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
  synchroniser six dépôts le même jour.

  ⚠️ **Le revers**, et il a mordu : *strippé* veut dire **silencieux**. Une app épinglée sur
  un tag antérieur à un champ le perd sans erreur — pas de rejet, juste un bloc qui disparaît
  du summary. C'est pourquoi le README dit de ne jamais pinner `#v1.0.0`, antérieur à `usage`.
- **Toute modification du contrat exige un test qui la couvre** : un cas valide ET un cas
  rejeté. Un test qui ne vérifie que « ça ne lève pas » ne prouve rien — Zod strippe au lieu
  de rejeter, donc l'absence d'exception est compatible avec le champ jeté en silence.
  Comparer ce que `validateSummary` REND, pas seulement le fait qu'il rende.

## 2. Conventions de code

- **TypeScript strict**, pas de `any` silencieux.
- **Erreurs honnêtes** : `validateSummary` liste toutes les issues Zod, il n'en avale aucune.
- **Pas de fake data** : une app sans moteur actif renvoie `buildingSummary(...)`, jamais des
  chiffres inventés. Le contrat porte `status: "building"` précisément pour ça.
- Les commentaires des schémas sont de la **documentation pour les producteurs** — ce sont
  eux qu'on lit en écrivant une app. Ce qui y est écrit doit être vrai côté hub.

## 3. Workflow git

- Branches `claude/<slug>`, commits en français préfixés, **PR en draft**.
- ❌ Jamais `--force` sur `main`. ❌ Jamais `--no-verify`.
- ⚠️ `git fetch origin main` avant de committer.
- ⚠️ **Une session Claude ne peut PAS pousser de tag.** Le proxy git rend `HTTP 403` sur les
  refs de tag (vérifié le 20/08/2026 en essayant, pas déduit), et les outils GitHub
  disponibles en session sont en lecture seule pour les tags et les releases. Le tag est une
  commande sur le poste de Marc, ou l'écran *Releases* de GitHub.

## 4. Commandes utiles

```bash
npm run build      # tsup → dist/ (CJS + ESM + .d.ts)
npm run test       # vitest
npm run typecheck  # tsc --noEmit
```

## 5. Vérifications avant commit

```bash
npm run build && npm run test && npm run typecheck
```

Les trois doivent passer.

## 8. Documentation (où vit quoi)

| Fichier | Contenu |
|---|---|
| `README.md` | Le contrat champ par champ. **C'est la doc des producteurs** — un tableau qui manque là se paie en apps qui publient à côté. |
| `CLAUDE.md` | Ce fichier. |
| `HANDOVER.md` | État des versions, des tags et des consommateurs. Procédure de release. |

⚠️ **Le README est la seule doc que lisent les six apps.** Le 20/08/2026, le bloc `usage`
existait dans le schéma depuis la v1.1.0 et le mot n'apparaissait **pas une seule fois** dans
le README : un producteur cherchant comment publier un coût n'avait aucun endroit où le lire.
Un champ ajouté au schéma sans sa ligne de README est un champ que personne n'utilisera.

## 9. Leçons apprises

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

## 10. Style et compte-rendu

> 📣 Forme des comptes-rendus, des commits, des PR et des docs générées :
> [convention commune aux neuf dépôts](https://github.com/MoKarade/claude-config/blob/main/conventions/COMPTE-RENDU.md).
> Elle régit **la forme** ; ce fichier garde **le contenu métier**. Sur la forme, c'est la
> convention qui gagne ; sur le métier, c'est ce fichier.

@docs/COMPTE-RENDU.md

⚠️ **Pourquoi une COPIE et pas seulement un lien.** Un `CLAUDE.md` ne charge rien hors de son
propre arbre : le lien ci-dessus est lisible par un humain, il n'arrive jamais dans la session.
C'est exactement le mode de panne du 20/08/2026 — les règles de cadrage écrites dans un
`~/.claude/CLAUDE.md` local ne descendaient nulle part, et Marc constatait « je ne vois pas la
différence » alors que rien n'était jamais arrivé. `docs/COMPTE-RENDU.md` est donc une copie
**synchronisée**, importée ci-dessus, et la CI échoue si elle a dérivé de la source.

Pour changer la convention : la changer dans `claude-config`, propager les huit copies, mettre
à jour les huit empreintes. La friction est le garde-fou — une copie qu'on peut modifier sur
place redevient huit conventions différentes en trois mois.

## 11. Procédure de release

1. Le changement est mergé sur `main`, gate vert.
2. `package.json` porte la bonne version — **majeure** si breaking (avec bump de
   `CONTRACT_VERSION` dans `src/index.ts`), **mineure** si additif optionnel.
3. **Marc pousse le tag annoté** `vX.Y.Z` (une session ne peut pas, cf. §3) :
   ```bash
   git fetch origin main
   git tag -a vX.Y.Z <sha> -m "hub-contract vX.Y.Z — <résumé>"
   git push origin vX.Y.Z
   ```
   Ou : GitHub → *Releases* → *Draft a new release* → *Create new tag on publish*.
4. `HANDOVER.md` note **quels consommateurs re-pinner**. Ils le font à leur rythme : tant
   qu'un dépôt n'est pas re-pinné il reste sur l'ancien contrat, et **c'est voulu**.

**Les six consommateurs** : Hubperso (dashboard) · FinanceAI (`mcp/`) · DriveAI (`api/`) ·
BatchChef (`web/`) · JobAI (racine) · app-template.
