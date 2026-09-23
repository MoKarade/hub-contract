# HANDOVER — hub-contract

## État du repo

- `package.json` annonce **`1.3.1`** (même contrat que `1.3.0`, `dist/` commité — voir plus bas).
  `CONTRACT_VERSION` reste **`1`** : les quatre ajouts de la v1.3 sont optionnels, donc
  additifs (règle d'évolution n°2 du `CLAUDE.md`).
- Contrat complet dans `src/index.ts` ; endpoint partagé dans `src/endpoint.ts`.
- Pour le nombre de tests et le détail des champs, voir la source qui fait foi — `npm test` et
  `README.md`. **Aucun chiffre au présent n'est recopié ici** : le précédent (« 38 tests »)
  était faux depuis des semaines sans que rien ne le signale.

### Historique des versions

| Version | Contenu | Tag |
|---|---|---|
| `1.0.0` | Contrat de base : `HubMetric` / `HubAlert` / `HubAction` / `HubSummary`, `validateSummary`, `buildingSummary`. | ✅ existe |
| `1.1.0` | Bloc `usage` (coûts & quotas), optionnel. | ✅ existe, pointe `3bbbf19` (2026-08-20) |
| `1.2.0` | `ContractTooNewError` : la version est sondée **avant** la structure, donc « trop récent » cesse d'être confondu avec « invalide ». `contractVersion` passe de `z.literal(1)` à un entier ≥ 1. | ✅ existe |
| `1.3.0` | `details` (vue détaillée), `primary` (le chiffre principal), `recommendation`, `expectedMaxAgeSec` (l'app déclare son propre rythme). Tous optionnels. | ✅ existe |
| `1.3.1` | Contrat identique à `1.3.0`. `dist/` commité : sans lui, une CI en Node 24 + `--ignore-scripts` ne reçoit aucun `dist/`. | poussé après le merge |

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

⚠️ À surveiller : npm 12 rend les dépendances git **opt-in** (`allow-git`, défaut `none`).
Tant que Node 24 embarque npm 11, rien à faire ; au passage à npm 12, chaque consommateur
aura besoin de `allow-git=root` dans son `.npmrc`.

## Comment tagger une release

```bash
# 1. S'assurer que tout passe
npm run build && npm run test && npm run typecheck

# 2. La version de package.json est déjà 1.3.0 (commitée avec le changement).
#    Règle : breaking → bump CONTRACT_VERSION dans src/index.ts + version MAJEURE
#            additif optionnel → version MINEURE, CONTRACT_VERSION inchangé

# 3. Tag annoté + push, depuis main à jour
git fetch origin main && git checkout main && git pull
git tag -a v1.3.0 -m "hub-contract v1.3.0 — details, primary, recommendation, expectedMaxAgeSec"
git push origin v1.3.0
```

### Après le push du tag, deux gestes qui ne s'oublient pas

1. **`README.md` § Installation** : remplacer `#v1.2.0` par `#v1.3.0` dans la commande
   d'exemple. Un exemple qui pointe un tag périmé est ce qui a fait perdre `usage` à des apps
   en 2026 — les clés inconnues sont strippées, donc la perte est silencieuse.
2. **Cocher la ligne `1.3.0`** du tableau ci-dessus.

## Consommateurs à re-pinner après chaque release

| Consommateur | Où | Action |
|---|---|---|
| Hubperso | dashboard `hubperso.com` | `npm install github:MoKarade/hub-contract#vX.Y.Z` |
| FinanceAI | `mcp/` | idem |
| DriveAI | `app/` (devDependency) | idem. ⚠️ `api/` est **zéro-dépendance par construction** et *inline* la forme du contrat : il ne se re-pinne pas, il se met à jour à la main, et c'est le test de `app/` qui verrouille la correspondance. |
| BatchChef | `web/` (`lib/hubSummary.ts`) | idem |
| JobAI | racine | idem |
| MemoryAI | racine | idem |
| CarAI | racine | idem |
| app-template | template des futures apps | idem |

*(BatchChef et JobAI manquaient à cette table — trouvé par l'audit de dette inter-dépôts de
JobAI, 2026-07-29. Toute nouvelle app consommatrice s'ajoute ici ET dans la liste du
`CLAUDE.md` §11, dans le même commit.)*

Un consommateur non re-pinné reste sur l'ancien tag : comportement voulu, aucune urgence tant
que le contrat qu'il utilise est encore servi par les apps.

### Ordre de re-pin pour la v1.3, et pourquoi il compte

**Le hub d'abord, les apps ensuite.** Les nouveaux champs sont produits par les apps et
consommés par le hub : une app re-pinnée avant le hub publie `details` dans le vide, et le hub
le strippe sans rien dire — donc on croit avoir livré quelque chose qui ne s'affiche nulle
part. Dans l'autre sens, un hub re-pinné avant les apps affiche simplement « pas de détail
publié », ce qui est vrai.
