"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  CONTRACT_VERSION: () => CONTRACT_VERSION,
  ContractTooNewError: () => ContractTooNewError,
  HUB_TOKEN_HEADER: () => HUB_TOKEN_HEADER,
  HubActionSchema: () => HubActionSchema,
  HubAlertSchema: () => HubAlertSchema,
  HubDetailItemSchema: () => HubDetailItemSchema,
  HubDetailSectionSchema: () => HubDetailSectionSchema,
  HubMetricSchema: () => HubMetricSchema,
  HubQuotaSchema: () => HubQuotaSchema,
  HubRecommendationSchema: () => HubRecommendationSchema,
  HubSummarySchema: () => HubSummarySchema,
  HubUsageSchema: () => HubUsageSchema,
  buildingSummary: () => buildingSummary,
  validateSummary: () => validateSummary
});
module.exports = __toCommonJS(index_exports);
var import_zod = require("zod");
var CONTRACT_VERSION = 1;
var HUB_TOKEN_HEADER = "x-hub-token";
var MesureSchema = import_zod.z.object({
  label: import_zod.z.string().min(1).max(40),
  value: import_zod.z.union([import_zod.z.number(), import_zod.z.string()]),
  format: import_zod.z.enum(["currency", "percent", "number", "text"]),
  /** Variation relative signée en % (ex: +2.3). Optionnel. */
  trend: import_zod.z.number().optional(),
  severity: import_zod.z.enum(["ok", "warn", "alert"]).optional()
});
var HubMetricSchema = MesureSchema.extend({
  /**
   * Cette métrique est LE chiffre de l'app — celui qui porte la grande tuile du hub
   * (additif v1.3, optionnel).
   *
   * ⚠️ C'est un drapeau PORTÉ PAR la métrique, et non un `primaryMetric: "<label>"` à la
   * racine du summary. La différence compte : une référence par libellé peut pendre dans le
   * vide (l'app renomme la métrique, oublie la référence, et le hub cherche un libellé qui
   * n'existe plus), alors qu'un drapeau ne peut désigner que ce à quoi il est attaché. Il
   * n'existe donc aucun état « désigne une métrique absente ».
   *
   * Une seule métrique peut le porter — voir le `refine` sur le tableau `metrics`. Le hub
   * retombe sur la première métrique quand aucune ne le porte : c'est ce qu'il faisait déjà,
   * la nouveauté est de pouvoir le dire au lieu de le laisser deviner.
   */
  primary: import_zod.z.boolean().optional()
});
var HubDetailItemSchema = MesureSchema.extend({
  /**
   * Précision affichée sous la valeur : l'unité, la période couverte, la base d'un
   * pourcentage. C'est ce qui empêche « +4,2 % » d'être ambigu — +4,2 % depuis quand, sur
   * quoi ? Un chiffre dont on ne peut pas dire ce qu'il mesure vaut moins qu'aucun chiffre.
   */
  hint: import_zod.z.string().max(80).optional()
});
var HubDetailSectionSchema = import_zod.z.object({
  title: import_zod.z.string().min(1).max(40),
  items: import_zod.z.array(HubDetailItemSchema).min(1).max(8)
});
var HubAlertSchema = import_zod.z.object({
  label: import_zod.z.string().min(1).max(80),
  severity: import_zod.z.enum(["info", "warn", "alert"]),
  /** Deep link vers l'écran concerné dans l'app. */
  href: import_zod.z.string().url().optional()
});
var HubActionSchema = import_zod.z.object({
  label: import_zod.z.string().min(1).max(40),
  /** "link" = deep link (v1). "trigger" = webhook POST (réservé v2, ne pas implémenter côté apps). */
  kind: import_zod.z.enum(["link", "trigger"]),
  href: import_zod.z.string().url(),
  /** Si présent, le hub demande confirmation avant d'exécuter. */
  confirm: import_zod.z.string().optional()
});
var HubQuotaSchema = import_zod.z.object({
  label: import_zod.z.string().min(1).max(40),
  /** Quantité consommée sur la période. */
  used: import_zod.z.number().min(0),
  /** Plafond connu ; null si l'app ne connaît pas de limite chiffrée. */
  limit: import_zod.z.number().positive().nullable(),
  /** Unité affichée (ex: "appels", "Go", "courriels"). Optionnel. */
  unit: import_zod.z.string().max(20).optional(),
  /** Quand le compteur se réinitialise (ex: quota quotidien). Optionnel. */
  resetAt: import_zod.z.string().datetime().optional()
});
var HubUsageSchema = import_zod.z.object({
  cost: import_zod.z.object({
    /** Montant dépensé (≥ 0), dans la devise indiquée. */
    amount: import_zod.z.number().min(0),
    currency: import_zod.z.enum(["USD", "CAD"]),
    /** Portée du montant : cumulé, ce mois-ci, ou aujourd'hui. */
    period: import_zod.z.enum(["total", "mois", "jour"])
  }).optional(),
  quotas: import_zod.z.array(HubQuotaSchema).max(10).optional()
});
var HubRecommendationSchema = import_zod.z.object({
  /** L'action, à l'impératif et chiffrée quand c'est possible. */
  label: import_zod.z.string().min(1).max(80),
  /** Pourquoi, en une phrase. Une recommandation sans raison ne se vérifie pas. */
  why: import_zod.z.string().min(1).max(140).optional(),
  /** Deep link vers l'écran où l'on fait la chose. */
  href: import_zod.z.string().url().optional()
});
var HubSummarySchema = import_zod.z.object({
  /**
   * Version du format de fil publiée par l'app. Volontairement PAS un `z.literal` :
   * voir `validateSummary`, qui sonde ce champ AVANT la structure pour pouvoir dire
   * « trop récent » au lieu de « invalide ».
   */
  contractVersion: import_zod.z.number().int().min(1),
  app: import_zod.z.object({
    /** Identifiant stable de l'app, kebab-case (ex: "financeai", "drive-ai"). */
    id: import_zod.z.string().regex(/^[a-z0-9-]+$/),
    name: import_zod.z.string().min(1).max(30),
    url: import_zod.z.string().url(),
    /** Couleur d'accent du widget, hex 6 digits. */
    color: import_zod.z.string().regex(/^#[0-9a-fA-F]{6}$/)
  }),
  /** Quand ce JSON a été généré. */
  generatedAt: import_zod.z.string().datetime(),
  /** Fraîcheur des données sous-jacentes si différente de generatedAt
      (ex: dernière synchronisation d'état). */
  dataAsOf: import_zod.z.string().datetime().optional(),
  /**
   * Âge maximal NORMAL de `dataAsOf`, en secondes (additif v1.3, optionnel).
   *
   * ── CE QU'IL RÉPARE ──────────────────────────────────────────────────────────────────
   *
   * Le hub voit `dataAsOf` mais ne sait pas si sa valeur est bonne ou mauvaise. « 40 min »
   * est parfaitement sain pour un véhicule qui se rafraîchit aux 30-60 min, et catastrophique
   * pour un moteur qui passe aux 5 min. Faute de savoir, le hub ne pouvait que deviner — donc
   * se tromper pour au moins une app, et un seuil deviné côté hub serait de la connaissance
   * d'app codée en dur, exactement ce que le contrat existe pour éviter.
   *
   * Avec ce champ, c'est l'app qui déclare son propre rythme et le hub ne fait que comparer.
   * Il peut alors distinguer, sans rien savoir du métier : donnée fraîche, donnée FIGÉE
   * au-delà du normal, et fraîcheur non déclarée. Mesuré le 14/09/2026 : un poll annoncé
   * toutes les 30 min avait un trou de 6 h 53, tous les runs verts et rien à l'écran.
   *
   * ── CE QU'IL NE PROMET PAS ───────────────────────────────────────────────────────────
   *
   * Un âge dépassé n'est pas une panne : c'est un retard OBSERVABLE. Le producteur déclare
   * un rythme attendu, pas une garantie — et c'est le hub qui décide comment le dire.
   *
   * Plafond à 30 jours : au-delà, ce n'est plus une déclaration de fraîcheur, c'est son
   * absence, et il vaut mieux omettre le champ que de promettre un mois.
   *
   * ⚠️ N'a aucun sens sans `dataAsOf` : voir le contrôle dans `validateSummary`.
   */
  expectedMaxAgeSec: import_zod.z.number().int().positive().max(2592e3).optional(),
  /** "building" = app en développement, moteur pas encore actif. */
  status: import_zod.z.enum(["ok", "degraded", "error", "building"]),
  metrics: import_zod.z.array(HubMetricSchema).max(6).refine(
    (metriques) => metriques.filter((m) => m.primary === true).length <= 1,
    { message: "au plus une m\xE9trique peut porter primary: true" }
  ),
  alerts: import_zod.z.array(HubAlertSchema).max(10),
  actions: import_zod.z.array(HubActionSchema).max(6),
  /**
   * La vue détaillée de l'app : des sections titrées, affichées quand on demande les détails
   * (additif v1.3, optionnel). Le plafond de 6 `metrics` protège la LISIBILITÉ DE LA CARTE ;
   * il n'avait aucune raison de borner ce qu'on peut consulter en cliquant.
   *
   * ⚠️ LES LIBELLÉS SERVENT DE CLÉ, DONC ILS DOIVENT ÊTRE UNIQUES. Le hub garde une mémoire
   * des relevés pour tracer l'évolution d'une valeur dans le temps, et cette série est
   * retrouvée PAR SON LIBELLÉ. Deux lignes homonymes dans la même section donneraient une
   * courbe qui saute d'une grandeur à l'autre — un graphe faux, sans rien d'anormal à
   * l'écran. Le couple (titre de section, libellé) est donc la clé, et les deux
   * contrôles ci-dessous sont ce qui la rend fiable : titres de sections distincts, et
   * libellés distincts À L'INTÉRIEUR d'une section.
   *
   * Deux sections PEUVENT réutiliser le même libellé (« Placements » sous « Aujourd'hui »
   * et sous « Depuis le début » est une forme légitime, et même la plus lisible) — c'est
   * exactement pourquoi la clé est le couple et non le libellé seul.
   */
  details: import_zod.z.array(HubDetailSectionSchema).max(6).refine(
    (sections) => new Set(sections.map((s) => s.title)).size === sections.length,
    { message: "deux sections de d\xE9tail ne peuvent pas porter le m\xEAme titre" }
  ).refine(
    (sections) => sections.every(
      (s) => new Set(s.items.map((i) => i.label)).size === s.items.length
    ),
    { message: "deux lignes d'une m\xEAme section ne peuvent pas porter le m\xEAme libell\xE9" }
  ).optional(),
  /** LA prochaine chose à faire selon l'app (additif v1.3, optionnel). */
  recommendation: HubRecommendationSchema.optional(),
  /** Coûts & quotas de l'app (additif v1.1 ; optionnel — les consumers v1.0 l'ignorent). */
  usage: HubUsageSchema.optional()
});
var ContractTooNewError = class extends Error {
  /** Version annoncée par l'app. */
  published;
  /** Version maximale que ce build sait lire. */
  supported;
  constructor(published, supported) {
    super(
      `contractVersion ${published} non support\xE9e \u2014 ce build lit jusqu'\xE0 la version ${supported}. L'app est en avance : re-pinner le consommateur sur une version du contrat >= ${published}.`
    );
    this.name = "ContractTooNewError";
    this.published = published;
    this.supported = supported;
  }
};
var VersionProbeSchema = import_zod.z.object({ contractVersion: import_zod.z.number().int().min(1) });
function formatIssue(issue) {
  const path = issue.path.length > 0 ? issue.path.join(".") : "(racine)";
  if (issue.code === import_zod.z.ZodIssueCode.invalid_union) {
    const branches = issue.unionErrors.flatMap((unionError) => unionError.issues).map((subIssue) => subIssue.message).join(" / ");
    return `${path}: ${issue.message} (${branches})`;
  }
  return `${path}: ${issue.message}`;
}
function verifierCoherences(summary) {
  if (summary.expectedMaxAgeSec !== void 0 && summary.dataAsOf === void 0) {
    throw new Error(
      "HubSummary invalide (1 issue) \u2014 expectedMaxAgeSec: sans dataAsOf, aucun \xE2ge n'est mesurable. Publier les deux, ou aucun des deux."
    );
  }
  return summary;
}
function validateSummary(data) {
  const probe = VersionProbeSchema.safeParse(data);
  if (probe.success && probe.data.contractVersion > CONTRACT_VERSION) {
    throw new ContractTooNewError(probe.data.contractVersion, CONTRACT_VERSION);
  }
  const result = HubSummarySchema.safeParse(data);
  if (result.success) {
    return verifierCoherences(result.data);
  }
  const issues = result.error.issues.map(formatIssue).join(" | ");
  throw new Error(
    `HubSummary invalide (${result.error.issues.length} issue${result.error.issues.length > 1 ? "s" : ""}) \u2014 ${issues}`
  );
}
function buildingSummary(app, opts) {
  return validateSummary({
    contractVersion: CONTRACT_VERSION,
    app,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    status: "building",
    metrics: [],
    alerts: [
      {
        label: opts?.alertLabel ?? "App en construction \u2014 pas encore de donn\xE9es",
        severity: "info"
      }
    ],
    actions: []
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CONTRACT_VERSION,
  ContractTooNewError,
  HUB_TOKEN_HEADER,
  HubActionSchema,
  HubAlertSchema,
  HubDetailItemSchema,
  HubDetailSectionSchema,
  HubMetricSchema,
  HubQuotaSchema,
  HubRecommendationSchema,
  HubSummarySchema,
  HubUsageSchema,
  buildingSummary,
  validateSummary
});
//# sourceMappingURL=index.js.map