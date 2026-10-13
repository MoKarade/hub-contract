# hub-contract - Architecture et contrats

> Carte du dépôt pour NotebookLM (carnet du dépôt et Carnet Maître inter-apps). À mettre à jour dans la même PR quand une interface publique, une dépendance externe ou un terme métier change. Rédigé à partir de main au commit d2f1f33c119d, le 2026-10-13.

## 1. Responsabilité du dépôt
**Domaine :** contrat d'intégration entre le hub perso (Hubperso, `hubperso.com`) et les apps (`<nom>.hubperso.com`).
**Rôle :** source de vérité du contrat `GET .../hub/summary` : schémas Zod, types TypeScript, helpers de validation, endpoint partagé et lecture de la session partagée. Aucune logique métier, aucune UI, aucun fetch, aucun secret ni donnée.
**Déploiement :** ne se déploie pas. Paquet `@mokarade/hub-contract` (version 1.4.0 dans `package.json`) installé par les consommateurs depuis GitHub, épinglé sur un tag `vX.Y.Z`, jamais publié sur npm. `dist/` est commité depuis v1.3.1.

## 2. Interfaces publiques (contrats)
*Ce que les autres dépôts, Hubperso, Claude ou l'utilisateur peuvent appeler.*
- Routes HTTP : aucune servie par ce dépôt. Il **définit** la route que chaque app expose : `GET .../hub/summary`, authentifiée par l'en-tête `x-hub-token`, réponse 401 si jeton absent ou invalide, toujours `Cache-Control: no-store`, sans CORS (le hub appelle côté serveur via son proxy).
- Outils MCP : aucun.
- Paquet / exports (trois points d'entrée, CJS + ESM + `.d.ts`) :
  - `@mokarade/hub-contract` (`src/index.ts`) : `HubSummarySchema` et le type `HubSummary`, avec les sous-structures nommées dans le README (`HubMetric`, `HubAlert`, `HubAction`, `HubUsage`, `HubQuota`, `HubDetailSection`, `HubDetailItem`, `HubRecommendation` ; liste exacte des exports : [à compléter] depuis `src/index.ts`) ; constantes `CONTRACT_VERSION` (vaut 1) et `HUB_TOKEN_HEADER` ; fonctions `validateSummary` et `buildingSummary` ; erreur `ContractTooNewError`.
  - `@mokarade/hub-contract/endpoint` (`src/endpoint.ts`) : `serveSummary` (endpoint écrit une fois, sans framework ; ordre des contrôles : méthode 405, configuration 503, autorisation 401, construction 500, validation puis 200) et comparaison de jetons `jetonsEgaux` (digest SHA-256 via `crypto.subtle`, compatible Edge).
  - `@mokarade/hub-contract/session` (`src/session.ts`, ajouté en 1.4.0) : `verifierSession(cookie, { keys })` lit le cookie de session signé ES256 par Hubperso ; rend `{ email, sub?, emisLe, expireLe }` ou `null`, jamais d'exception. `kid`, `exp`, `iat` obligatoires, émetteur `hubperso.com`, tolérance d'horloge 30 s. Aucune clé privée ici.
- Contrat Hub (forme du JSON `HubSummary`) :
  - Racine : `contractVersion` (entier >= 1), `app` (`id` kebab-case, `name` 1-30, `url` absolue, `color` hex 6), `generatedAt` (ISO 8601 UTC, suffixe `Z`), `dataAsOf?`, `expectedMaxAgeSec?` (exige `dataAsOf`), `status` (`ok` | `degraded` | `error` | `building`), `metrics` (max 6, au plus une `primary`), `alerts` (max 10), `actions` (max 6), `details?` (max 6 sections), `recommendation?` (une seule), `usage?`.
  - `HubAction.kind` : `link` (v1) ; `trigger` réservé v2, à ne pas implémenter côté apps.
  - `HubUsage.cost.period` : `total` | `mois` | `jour` ; le hub ne fusionne jamais deux périodes différentes.
  - Clés inconnues strippées (pas rejetées) : un consommateur épinglé sur un ancien tag perd un champ en silence.
  - Deux modes d'échec de `validateSummary` : `ContractTooNewError` (le consommateur doit re-pinner) et `Error` listant les issues Zod (l'app doit corriger).

## 3. Dépendances externes
*Ce que ce dépôt appelle.*
- **Autres dépôts de Marc :** aucun appel. Consommateurs à re-pinner après chaque release : Hubperso (dashboard), FinanceAI (`mcp/`), DriveAI (`app/` ; `api/` recopie la forme à la main, zéro dépendance), BatchChef (`web/`), JobAI, MemoryAI, CarAI, app-template. Le sous-chemin `/session` concerne Hubperso, JobAI, CarAI, MemoryAI et BatchChef.
- **Services externes :** aucun à l'exécution. CI GitHub Actions (gitleaks, Semgrep, Dependabot pour les actions seulement).
- **Données :** aucune. Dépendance runtime unique : `zod` (^3). `jose` (^6) en peerDependency optionnelle, seulement pour `/session`.

## 4. Carte structurelle
*L'arbre complet est généré automatiquement dans la source 00 ; ici, seulement le rôle des dossiers.*
```text
src/          -> le contrat : index.ts (schémas, types, helpers), endpoint.ts, session.ts
dist/         -> sortie tsup commitée (CJS, ESM, .d.ts) ; reconstruite à chaque changement de src/
tests/        -> tests Vitest du contrat, de l'endpoint, de la session et du chemin d'installation consommateur
qualite/      -> portes qualité de l'Atelier (portes.mjs) et seuils du cliquet (seuils.json)
docs/         -> COMPTE-RENDU.md, copie synchronisée de la convention commune de compte-rendu
.github/      -> CI (gate, qualité, sécurité), fusion automatique, Dependabot
```

## 5. Glossaire métier (anti-hallucination)
- **HubSummary :** le JSON complet qu'une app renvoie au hub sur `GET .../hub/summary`.
- **HubMetric / HubAlert / HubAction :** une mesure, une alerte (ce qui va mal), une action proposée (lien profond).
- **primary :** marque LA métrique qui porte la grande tuile du hub ; au plus une par summary (v1.3).
- **details / HubDetailSection / HubDetailItem :** vue détaillée consultée en cliquant ; libellés uniques par couple (titre de section, libellé), car le hub retrouve ses séries par libellé (v1.3).
- **HubRecommendation :** LA prochaine chose à faire (une seule) ; distincte d'une alerte (v1.3).
- **expectedMaxAgeSec :** âge maximal normal de `dataAsOf` déclaré par l'app ; permet au hub de distinguer donnée fraîche, figée ou non déclarée (v1.3).
- **HubUsage / HubQuota :** coûts et quotas optionnels ; `limit: null` si aucun plafond connu (v1.1).
- **CONTRACT_VERSION :** version du format du contrat (1), distincte de la version npm du paquet.
- **ContractTooNewError :** levée quand le summary est plus récent que le contrat connu ; la version est sondée avant la structure (v1.2).
- **buildingSummary :** summary honnête d'une app sans moteur actif (`status: "building"`), jamais de faux chiffres.
- **x-hub-token / HUB_TOKEN_HEADER :** en-tête qui authentifie le hub auprès d'une app.
- **Re-pin :** mise à jour du tag épinglé chez un consommateur ; ordre pour la v1.3 : le hub d'abord, les apps ensuite.
- **Breaking change :** retirer ou renommer un champ, rendre requis un champ optionnel, restreindre une regex, un enum ou une longueur, changer une sémantique ; exige un bump de `CONTRACT_VERSION` et un tag majeur.
- **Portes qualité / cliquet :** contrôles CI dont les seuils ne peuvent que se resserrer (`qualite/seuils.json`).

## 6. Pour aller plus loin
- `README.md` : le contrat champ par champ, seule doc lue par les apps productrices.
- `CLAUDE.md` : règles de travail, règles d'évolution du contrat et procédure de release (le tag est poussé par Marc, une session Claude ne peut pas pousser de tag).
- `HANDOVER.md` : historique des versions et des tags, consommateurs à re-pinner, chaîne de CI, portes qualité.
- `docs/COMPTE-RENDU.md` : convention de forme commune, copie synchronisée vérifiée par la CI.
