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

/**
 * Le payload complet renvoyé par `GET .../hub/summary`.
 * C'est LE contrat : le hub ne connaît rien d'autre des apps.
 */
export const HubSummarySchema = z.object({
  contractVersion: z.literal(CONTRACT_VERSION),
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
});

export type HubMetric = z.infer<typeof HubMetricSchema>;
export type HubAlert = z.infer<typeof HubAlertSchema>;
export type HubAction = z.infer<typeof HubActionSchema>;
export type HubSummary = z.infer<typeof HubSummarySchema>;

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
 * Retourne le summary typé, ou jette une Error listant chaque issue Zod
 * (chemin + message, branches d'union détaillées) pour un diagnostic
 * immédiat côté hub.
 */
export function validateSummary(data: unknown): HubSummary {
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
