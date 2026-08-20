import { z } from "zod";

/**
 * Version du contrat. Toute rupture de compatibilité = bump + nouveau tag.
 * Les changements additifs optionnels (nouveau champ `.optional()`) ne bumpent
 * PAS cette constante — voir CLAUDE.md pour les règles d'évolution.
 */
export const CONTRACT_VERSION = 1;

/**
 * Header HTTP que le hub envoie à chaque requête `GET .../hub/summary`.
 * Une app DOIT répondre 401 si le token est absent ou invalide.
 */
export const HUB_TOKEN_HEADER = "x-hub-token";

/** Une métrique affichée dans le widget de l'app (max 6 par summary). */
export const HubMetricSchema = z.object({
  label: z.string().min(1).max(40),
  value: z.union([z.number(), z.string()]),
  format: z.enum(["currency", "percent", "number", "text"]),
  /** Variation relative signée en % (ex: +2.3). Optionnel. */
  trend: z.number().optional(),
  severity: z.enum(["ok", "warn", "alert"]).optional(),
});

/** Une alerte remontée au hub (max 10 par summary). */
export const HubAlertSchema = z.object({
  label: z.string().min(1).max(80),
  severity: z.enum(["info", "warn", "alert"]),
  /** Deep link vers l'écran concerné dans l'app. */
  href: z.string().url().optional(),
});

/** Une action proposée par l'app dans son widget (max 6 par summary). */
export const HubActionSchema = z.object({
  label: z.string().min(1).max(40),
  /** "link" = deep link (v1). "trigger" = webhook POST (réservé v2, ne pas implémenter côté apps). */
  kind: z.enum(["link", "trigger"]),
  href: z.string().url(),
  /** Si présent, le hub demande confirmation avant d'exécuter. */
  confirm: z.string().optional(),
});

/** État d'un quota d'API/service consommé par l'app (carte « Coûts & quotas » du hub). */
export const HubQuotaSchema = z.object({
  label: z.string().min(1).max(40),
  /** Quantité consommée sur la période. */
  used: z.number().min(0),
  /** Plafond connu ; null si l'app ne connaît pas de limite chiffrée. */
  limit: z.number().positive().nullable(),
  /** Unité affichée (ex: "appels", "Go", "courriels"). Optionnel. */
  unit: z.string().max(20).optional(),
  /** Quand le compteur se réinitialise (ex: quota quotidien). Optionnel. */
  resetAt: z.string().datetime().optional(),
});

/**
 * Coût et quotas de l'app (tout optionnel). Une app qui ne suit rien omet ce bloc — le hub
 * l'affiche « non suivi », jamais un 0 inventé.
 *
 * ⚠️ LE HUB NE FUSIONNE JAMAIS DEUX `period` DIFFÉRENTES. Il somme les `cost` PAR période
 * (« cumulé », « ce mois-ci », « aujourd'hui ») et affiche un montant par période, avec son
 * étiquette. Il n'existe volontairement AUCUN total global : additionner un cumul et un mois
 * courant donne un nombre qui n'existe pas — et qui est SOUS-ESTIMÉ, puisqu'il manque les
 * mois passés de l'app qui déclare « mois ». C'est arrivé, et c'était affiché « cumulé »
 * (correctif du 31/07/2026 côté hub, cf. Hubperso/lib/usage.ts).
 *
 * Conséquence pour un producteur : choisir la `period` qui décrit VRAIMENT le montant, pas
 * celle qui l'affiche le mieux. Publier un mois courant sous `total` n'est pas un arrondi,
 * c'est un chiffre juste rangé sous une étiquette fausse — et le hub l'additionnera avec les
 * cumuls des autres apps. Si les deux valeurs existent, publier le CUMUL en `cost` et mettre
 * le mois dans un `quota` avec son plafond : rien n'est perdu, et le hub peut enfin afficher
 * un seul montant honnête.
 */
export const HubUsageSchema = z.object({
  cost: z
    .object({
      /** Montant dépensé (≥ 0), dans la devise indiquée. */
      amount: z.number().min(0),
      currency: z.enum(["USD", "CAD"]),
      /** Portée du montant : cumulé, ce mois-ci, ou aujourd'hui. */
      period: z.enum(["total", "mois", "jour"]),
    })
    .optional(),
  quotas: z.array(HubQuotaSchema).max(10).optional(),
});

/**
 * Le payload complet renvoyé par `GET .../hub/summary`.
 * C'est LE contrat : le hub ne connaît rien d'autre des apps.
 */
export const HubSummarySchema = z.object({
  /**
   * Version du format de fil publiée par l'app. Volontairement PAS un `z.literal` :
   * voir `validateSummary`, qui sonde ce champ AVANT la structure pour pouvoir dire
   * « trop récent » au lieu de « invalide ».
   */
  contractVersion: z.number().int().min(1),
  app: z.object({
    /** Identifiant stable de l'app, kebab-case (ex: "financeai", "drive-ai"). */
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1).max(30),
    url: z.string().url(),
    /** Couleur d'accent du widget, hex 6 digits. */
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  /** Quand ce JSON a été généré. */
  generatedAt: z.string().datetime(),
  /** Fraîcheur des données sous-jacentes si différente de generatedAt
      (ex: dernière synchronisation d'état). */
  dataAsOf: z.string().datetime().optional(),
  /** "building" = app en développement, moteur pas encore actif. */
  status: z.enum(["ok", "degraded", "error", "building"]),
  metrics: z.array(HubMetricSchema).max(6),
  alerts: z.array(HubAlertSchema).max(10),
  actions: z.array(HubActionSchema).max(6),
  /** Coûts & quotas de l'app (additif v1.1 ; optionnel — les consumers v1.0 l'ignorent). */
  usage: HubUsageSchema.optional(),
});

export type HubMetric = z.infer<typeof HubMetricSchema>;
export type HubAlert = z.infer<typeof HubAlertSchema>;
export type HubAction = z.infer<typeof HubActionSchema>;
export type HubQuota = z.infer<typeof HubQuotaSchema>;
export type HubUsage = z.infer<typeof HubUsageSchema>;
export type HubSummary = z.infer<typeof HubSummarySchema>;

/**
 * Le summary est syntaxiquement lisible mais annonce une version du contrat que CE build
 * ne sait pas lire (`contractVersion > CONTRACT_VERSION`).
 *
 * Elle existe pour une raison précise : **c'est le seul mode d'échec qui n'est pas la faute
 * de l'app.** Sans elle, un hub épinglé sur v1 qui reçoit un summary v2 lève la même erreur
 * que pour un JSON malformé, et affiche « invalide » — ce qui accuse l'app alors que c'est le
 * hub qui est en retard d'un re-pin. Le diagnostic pointe le mauvais dépôt, et la vraie action
 * (re-pinner le consommateur) n'est nulle part.
 *
 * Elle est aussi ce qui rend un déploiement ORDONNÉ possible. Avec un `z.literal`, hub et apps
 * doivent basculer au même instant : il n'existe aucune fenêtre où les deux versions coexistent,
 * donc aucun ordre de déploiement valide. Un contrat qui interdit sa propre évolution finit par
 * ne jamais évoluer.
 */
export class ContractTooNewError extends Error {
  /** Version annoncée par l'app. */
  readonly published: number;
  /** Version maximale que ce build sait lire. */
  readonly supported: number;

  constructor(published: number, supported: number) {
    super(
      `contractVersion ${published} non supportée — ce build lit jusqu'à la version ${supported}. ` +
        `L'app est en avance : re-pinner le consommateur sur une version du contrat >= ${published}.`,
    );
    this.name = "ContractTooNewError";
    this.published = published;
    this.supported = supported;
  }
}

/**
 * Sonde minimale : ne lit QUE la version, pour la juger avant la structure.
 * Un changement de version majeure peut légitimement renommer ou retirer un champ — parser
 * d'abord et sonder ensuite ferait échouer la structure en premier, et l'erreur « trop récent »
 * ne sortirait jamais. L'ordre est donc: version, PUIS structure.
 */
const VersionProbeSchema = z.object({ contractVersion: z.number().int().min(1) });

function formatIssue(issue: z.ZodIssue): string {
  const path = issue.path.length > 0 ? issue.path.join(".") : "(racine)";
  if (issue.code === z.ZodIssueCode.invalid_union) {
    const branches = issue.unionErrors
      .flatMap((unionError) => unionError.issues)
      .map((subIssue) => subIssue.message)
      .join(" / ");
    return `${path}: ${issue.message} (${branches})`;
  }
  return `${path}: ${issue.message}`;
}

/**
 * Valide un payload inconnu contre le contrat.
 *
 * Retourne le summary typé, ou jette — et **les deux modes d'échec ne disent pas la même
 * chose**, c'est tout l'intérêt de les séparer :
 *
 * - `ContractTooNewError` — l'app publie une version que ce build ne lit pas. L'app va bien,
 *   c'est le consommateur qui est à re-pinner.
 * - `Error` — le payload est hors contrat. Le message liste chaque issue Zod (chemin + message,
 *   branches d'union détaillées) pour un diagnostic immédiat côté hub.
 *
 * ⚠️ Zod **strippe** les clés inconnues au lieu de les rejeter : un consommateur épinglé sur un
 * tag antérieur à un champ le perd SANS erreur. Un test de contrat doit donc comparer ce qui est
 * RENDU, jamais se contenter de « ça ne lève pas ».
 */
export function validateSummary(data: unknown): HubSummary {
  const probe = VersionProbeSchema.safeParse(data);
  if (probe.success && probe.data.contractVersion > CONTRACT_VERSION) {
    throw new ContractTooNewError(probe.data.contractVersion, CONTRACT_VERSION);
  }

  const result = HubSummarySchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  const issues = result.error.issues.map(formatIssue).join(" | ");
  throw new Error(
    `HubSummary invalide (${result.error.issues.length} issue${result.error.issues.length > 1 ? "s" : ""}) — ${issues}`,
  );
}

/**
 * Fabrique un summary minimal honnête pour une app encore en développement :
 * status "building", aucune métrique, une seule alerte info, aucune action.
 * Le résultat est validé contre le contrat avant d'être retourné.
 */
export function buildingSummary(
  app: HubSummary["app"],
  opts?: { alertLabel?: string },
): HubSummary {
  return validateSummary({
    contractVersion: CONTRACT_VERSION,
    app,
    generatedAt: new Date().toISOString(),
    status: "building",
    metrics: [],
    alerts: [
      {
        label: opts?.alertLabel ?? "App en construction — pas encore de données",
        severity: "info",
      },
    ],
    actions: [],
  });
}
