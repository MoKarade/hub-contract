# HANDOVER — hub-contract

## État du repo

- `package.json` annonce **`1.3.0`**. `CONTRACT_VERSION` reste **`1`** : les quatre ajouts de
  la v1.3 sont optionnels, donc additifs (règle d'évolution n°2 du `CLAUDE.md`).
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
| `1.3.0` | `details` (vue détaillée), `primary` (le chiffre principal), `recommendation`, `expectedMaxAgeSec` (l'app déclare son propre rythme). Tous optionnels. | ⬜ **à pousser par Marc** |

## ⬜ Le tag `v1.3.0` reste à pousser

⚠️ **Une session Claude ne peut pas pousser de tag.** Le proxy git rend `HTTP 403` sur les
refs de tag (vérifié le 2026-08-20, pas déduit), et les outils GitHub disponibles en session
sont en lecture seule pour les tags et les releases. C'est une commande sur le poste de Marc,
ou l'écran *Releases* de GitHub.

Tant que le tag n'existe pas, **aucun consommateur ne peut consommer la v1.3** : les cinq apps
et le hub restent sur leur pin actuel et ignorent silencieusement les nouveaux champs. C'est
le comportement voulu, mais ça veut dire que le tag est la porte d'entrée de tout le reste du
chantier.

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
