# HANDOVER — hub-contract

## État au 15/10/2026

- **Ce qui tourne** : le paquet est en `1.4.0` (`package.json`), `CONTRACT_VERSION = 1`. Tags
  présents sur `origin` (mesuré par `git ls-remote --tags origin` les 14 et 15/10) : `v1.0.0`,
  `v1.1.0`, `v1.3.0`, `v1.3.1`, `v1.4.0`. **Il n'existe pas de tag `v1.2.0`** : le contenu de
  la 1.2.0 (`ContractTooNewError`, `/endpoint`) n'est livré qu'à partir de `v1.3.0`.
- **Livré depuis la dernière mise à jour** (d'après `git log`) : `v1.4.0` taguée sur `0c3309d`
  (sous-chemin `/session`, #19/#21) ; gitleaks 8.28.0 → 8.30.1 (#23) ; README pointé sur
  `v1.4.0` (#25) ; outillage Atelier et SonarCloud retirés, fusion confiée à Mergify (#34) ;
  file Mergify compatible avec la protection « branche à jour » et ordre des lignes des `.d.ts`
  toléré par la vérification de `dist/` (#37, #38).
- **Fusion** : Mergify (`.mergify.yml`, depuis le 15/10) fusionne en squash une PR hors
  brouillon, sans l'étiquette `hold`, dont Gate, Qualité et Sécurité sont verts. Une PR qui
  touche `.github/`, `scripts/hooks/`, `qualite/`, `vercel.json`, `drizzle/` ou `.env*` est fusionnée aussi quand le contrôle « Garde-fou » est vert (oui de Marc, 15/10/2026) ; rouge (test retiré ou sauté, seuil baissé, secret, migration destructive, `.mergify.yml` ou garde-fou modifié), elle attend Marc (issue `qui:marc`).
- **Couverture (cliquet)** : la CI (job Qualité) mesure la couverture des lignes et des branches de
  `src/` et l'affiche dans le résumé du run ; `qualite/seuils.json` fige le seuil sur la mesure et
  il ne peut que monter (`npm run portes:maj`). Aucun chiffre cible : le seuil est la mesure. Une PR
  qui la fait baisser rend la porte « RECUL », donc le job rouge. Les valeurs vivent dans
  `qualite/seuils.json`, pas ici.
- **Pins des consommateurs** : voir « Re-pin pour la v1.4.0 » plus bas (une seule source).
- **En cours** : rien dans ce dépôt.
- **Gel décidé par Marc le 14/10 : aucun nouveau travail sur les apps tant que le plan de
  réduction du temps des PR est en cours.**

## État du repo

- `package.json` annonce **`1.4.0`** (v1.3.1 + le sous-chemin `/session`, `dist/` commité — voir plus bas).
  `CONTRACT_VERSION` reste **`1`** : les quatre ajouts de la v1.3 sont optionnels, donc
  additifs (règle d'évolution n°2 de `docs/claude/01-principes.md`).
- Contrat complet dans `src/index.ts` ; endpoint partagé dans `src/endpoint.ts`.
- Pour le nombre de tests et le détail des champs, voir la source qui fait foi — `npm test` et
  `README.md`. **Aucun chiffre au présent n'est recopié ici** : le précédent (« 38 tests »)
  était faux depuis des semaines sans que rien ne le signale.

### Historique des versions

| Version | Contenu | Tag |
|---|---|---|
| `1.0.0` | Contrat de base : `HubMetric` / `HubAlert` / `HubAction` / `HubSummary`, `validateSummary`, `buildingSummary`. | ✅ existe |
| `1.1.0` | Bloc `usage` (coûts & quotas), optionnel. | ✅ existe, pointe `3bbbf19` (2026-08-20) |
| `1.2.0` | `ContractTooNewError` : la version est sondée **avant** la structure, donc « trop récent » cesse d'être confondu avec « invalide ». `contractVersion` passe de `z.literal(1)` à un entier ≥ 1. | ❌ **jamais tagué** (absent d'`origin` au 14/10) — contenu livré à partir de `v1.3.0` |
| `1.3.0` | `details` (vue détaillée), `primary` (le chiffre principal), `recommendation`, `expectedMaxAgeSec` (l'app déclare son propre rythme). Tous optionnels. | ✅ existe (tag léger, pointe `bd47d5f`) |
| `1.3.1` | Contrat identique à `1.3.0`. `dist/` commité : sans lui, une CI en Node 24 + `--ignore-scripts` ne reçoit aucun `dist/`. | ✅ existe, pointe `625bd11` |
| `1.4.0` | Nouveau sous-chemin `@mokarade/hub-contract/session` : `verifierSession`, lecture de la session partagée signée ES256 (chantier auth-asym). Additif : `/index` inchangé, `CONTRACT_VERSION` reste `1`. | ✅ existe (tag léger, pointe `0c3309d`) |

## La chaîne de CI, et le seul verrou de L2 qui n'a PAS été posé ici

Durcissement du 2026-09-18 (audit de remédiation, lot L2) :

- Les **deux** étapes `actions/checkout` portent `persist-credentials: false`. Aucun workflow de
  ce dépôt ne pousse ni n'appelle `gh` — vérifié étape par étape, pas supposé.
- ⚠️ Le checkout du job `gate` porte aussi `fetch-depth: 0`, et **ce n'est pas décoratif** :
  l'étape qui vérifie l'existence du tag faisait un `git fetch --tags`, donc un appel réseau
  authentifié par le jeton qu'on vient de retirer. Le dépôt est public (mesuré), donc un fetch
  anonyme passerait — mais le jour d'un passage en privé, l'étape échouerait et sa cause serait
  dans le `with:` du checkout, pas dans l'étape qui rougit. Les tags arrivent donc par le
  checkout, qui s'authentifie AVANT de jeter le jeton, et l'étape ne touche plus au réseau.
- `npm ci --ignore-scripts`, mesuré avant d'être posé : install OK, binaire esbuild 0.27.7
  fonctionnel (il vient de la dépendance **optionnelle** `@esbuild/linux-x64`, installée quels
  que soient les scripts), build + 77 tests + typecheck verts.

⚠️ **Ce que `--ignore-scripts` a coûté ici, et pourquoi c'est le seul dépôt où la question s'est
posée.** Le `npm ci` de ce dépôt n'était pas un simple `npm ci` : son commentaire disait
« c'est exactement ce que vit un consommateur qui installe depuis git », parce qu'il déclenchait
le script `prepare` (donc `build`). C'était **le seul contrôle du chemin d'installation des six
consommateurs**, et npm n'offre aucun moyen d'ignorer les scripts des DÉPENDANCES sans ignorer
le sien. La garantie n'est pas abandonnée, elle est découpée en deux :

1. l'étape `Build` prouve que la **commande** du `prepare` réussit ;
2. `tests/cheminConsommateur.test.ts` prouve que `package.json` la **déclare** toujours en
   `prepare`, et que `main`/`module`/`types` pointent bien dans `dist/`.

Les deux sont nécessaires : sans la seconde, retirer le `prepare` casserait les six apps
(une installation depuis git ne livre aucun `dist/`) sans rien faire rougir. Sa discrimination
est prouvée par trois perturbations séparées, un rouge chacune — dont celle qui montre que le
cas « `build` déclaré » n'est pas décoratif : le retirer laisse le cas « `prepare` lance build »
VERT, puisqu'il ne lit qu'une déclaration.

## `dist/` commité depuis v1.3.1 — pourquoi

Mesuré le 23/09/2026, au passage de tous les dépôts à Node 24 : **npm 11 ne lance plus le
`prepare` d'une dépendance git quand l'install tourne en `--ignore-scripts`** (npm 10 le
lançait quand même). Les CI des consommateurs font `npm ci --ignore-scripts` : leur
`node_modules/@mokarade/hub-contract` ne contenait plus que `package.json` et `README.md`, et
six gates sont tombés sur `Cannot find module '@mokarade/hub-contract'`.

Options écartées : réautoriser les scripts dans les CI (rouvre la surface que
`[CI-IGNORE-SCRIPTS]` ferme), épingler npm 10 (repousse le problème, npm 12 durcit encore),
publier sur un registre (compte et jeton à gérer pour un paquet privé à l'usage).

Ce qui garde le dispositif : l'étape CI « dist/ commité = sortie du build » (rebuild puis
`git status` vide, et chaque point d'entrée de `package.json` suivi par git) et
`.gitattributes` (sources et `dist/` en LF, sinon un build Windows diffère par les `.map`).
Le `prepare` reste : là où les scripts tournent (Vercel), il recompile le même `dist/`.

⚠️ **npm 12** rend les dépendances git **opt-in** (`allow-git`, défaut `none`) et coupe les scripts
d'installation par défaut. Mesuré le 23/09/2026 sur JobAI (v1.3.1, `npm ci --ignore-scripts`) :

| npm | sans `.npmrc` | `allow-git=root` |
|---|---|---|
| 11.12.1 (Node 24.15, poste de Marc) | ✅ | ❌ refuse la dépendance — bogue de `root` sur lockfile |
| 11.20.0 | ✅ | ✅ |
| 12.1.0 | ❌ « Refusing to fetch » | ✅ |

Conséquences : **ne PAS poser `allow-git=root` tant qu'un npm < 11.20 peut tourner** (poste, Vercel) —
il casserait l'installation aujourd'hui. Aucun Node ne livrait npm 12 au 23/09/2026 (Node 24.21 → npm
11.19.0, Node 26.10 → 11.19.1). Le jour où un Node livre npm 12 : ajouter `allow-git=root` dans le
`.npmrc` de chaque consommateur (dossier du `package.json` qui déclare le contrat). Le `dist/`
commité règle déjà l'autre moitié (scripts coupés = plus de `prepare`). Tous les consommateurs
étaient sur v1.3.1 au 23/09/2026 (DriveAI `app/` et app-template compris) ; pins actuels : section « Re-pin pour la v1.4.0 ».

## Comment tagger une release

```bash
# 1. S'assurer que tout passe
npm run build && npm run test && npm run typecheck

# 2. La version de package.json est déjà X.Y.Z (commitée avec le changement).
#    Règle : breaking → bump CONTRACT_VERSION dans src/index.ts + version MAJEURE
#            additif optionnel → version MINEURE, CONTRACT_VERSION inchangé

# 3. Tag annoté + push, depuis main à jour
git fetch origin main && git checkout main && git pull
git tag -a vX.Y.Z <sha> -m "hub-contract vX.Y.Z — <résumé>"
git push origin vX.Y.Z
```

### Après le push du tag, deux gestes qui ne s'oublient pas

1. **`README.md` § Installation** : remplacer l'ancien tag par `#vX.Y.Z` dans la commande
   d'exemple, et ajouter la ligne `vX.Y.Z` au tableau « Ce que chaque tag apporte ».
   Vérifier ensuite que le tag existe VRAIMENT (`git ls-remote --tags origin`) : la ligne
   `1.2.0` a été cochée « existe » sans que le tag ait jamais été poussé. Un exemple qui pointe un tag périmé est ce qui a fait perdre `usage` à des apps
   en 2026 — les clés inconnues sont strippées, donc la perte est silencieuse.
2. **Cocher la ligne `X.Y.Z`** du tableau ci-dessus.

## Consommateurs à re-pinner après chaque release

| Consommateur | Où | Action |
|---|---|---|
| Hubperso | dashboard `hubperso.com` | `npm install github:MoKarade/hub-contract#vX.Y.Z` |
| FinanceAI | racine (`package.json`, utilisé par `mcp/`) | idem |
| DriveAI | `app/` (devDependency) | idem. ⚠️ `api/` est **zéro-dépendance par construction** et *inline* la forme du contrat : il ne se re-pinne pas, il se met à jour à la main, et c'est le test de `app/` qui verrouille la correspondance. |
| BatchChef | `web/` (`lib/hubSummary.ts`) | idem |
| JobAI | racine | idem |
| MemoryAI | racine | idem |
| CarAI | racine | idem |
| app-template | template des futures apps | idem |

*(BatchChef et JobAI manquaient à cette table — trouvé par l'audit de dette inter-dépôts de
JobAI, 2026-07-29. Toute nouvelle app consommatrice s'ajoute ici ET dans la liste du
`docs/claude/11-release.md` et dans le « Contexte » de `CLAUDE.md`, dans le même commit.)*

Un consommateur non re-pinné reste sur l'ancien tag : comportement voulu, aucune urgence tant
que le contrat qu'il utilise est encore servi par les apps.

### Re-pin pour la v1.4.0 (`/session`) — qui, et pas d'urgence

Concernés : **Hubperso, JobAI, CarAI, MemoryAI, BatchChef** — les 5 apps du chantier auth-asym, seules à importer `@mokarade/hub-contract/session`. Ils re-pinnent **à leur rythme** : ce n'est 
pas obligatoire tout de suite, un dépôt non re-pinné reste sur son tag actuel (`/index` est inchangé). Les autres consommateurs (FinanceAI, DriveAI, app-template) n'ont rien à faire.

État au 15/10/2026 : **en v1.4.0** — CarAI, JobAI, MemoryAI ; **re-pin en cours** (PR du 15/10, standard des dépôts qui aligne tout le parc sur v1.4.0) — Hubperso, app-template, DriveAI, BatchChef, FinanceAI.

### Ordre de re-pin pour la v1.3, et pourquoi il compte

**Le hub d'abord, les apps ensuite.** Les nouveaux champs sont produits par les apps et
consommés par le hub : une app re-pinnée avant le hub publie `details` dans le vide, et le hub
le strippe sans rien dire — donc on croit avoir livré quelque chose qui ne s'affiche nulle
part. Dans l'autre sens, un hub re-pinné avant les apps affiche simplement « pas de détail
publié », ce qui est vrai.

## Portes qualité de l'Atelier (S6, 23/09/2026)

Contrôles automatiques en CI, jobs **Qualité** et **Sécurité** : la fusion automatique les attend.
Principe du **cliquet** : `qualite/seuils.json` fige l'état du jour de la mise en place ; rien ne peut
reculer. `npm run portes` mesure en local, `npm run portes:maj` resserre après une amélioration.

| Porte | Seuil de départ |
|---|---|
| Typage (erreurs) | ≤ 0 |
| Tests en échec | ≤ 0 |
| Couverture `src/` (% lignes) | ≥ 100.0 |
| Couverture globale (% lignes) | ≥ 100.0 |
| Couverture globale (% branches) | ≥ 93.7 |
| Code mort (knip) | ≤ 0 |
| Règles d'architecture (dependency-cruiser) | ≤ 0 |

Sécurité : gitleaks sur l'historique qui serait fusionné (HEAD) + Semgrep (TypeScript, React, Next.js, secrets, OWASP), bloquants.
Pas de porte lint : ce dépôt n'a pas d'ESLint (`config.lint` vide). Dependabot : actions seulement
(une montée de tsup/TypeScript change dist/, que Dependabot ne sait pas reconstruire ; zod = le contrat) —
les alertes de sécurité restent actives. Voir `.github/dependabot.yml`.
