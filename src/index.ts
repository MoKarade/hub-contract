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

/**
 * La forme commune à tout ce qui est « un libellé et un nombre » dans ce contrat : une
 * métrique de carte (`HubMetric`) et une ligne de détail (`HubDetailItem`).
 *
 * Elle n'est PAS exportée, et c'est une décision. Les deux usages divergent par un champ
 * chacun (`primary` pour la carte, `hint` pour le détail), et exporter la base inviterait un
 * producteur à publier une mesure « neutre » qui n'est ni l'un ni l'autre — donc que le hub
 * ne saurait pas où mettre.
 */
const MesureSchema = z.object({
  label: z.string().min(1).max(40),
  value: z.union([z.number(), z.string()]),
  format: z.enum(["currency", "percent", "number", "text"]),
  /** Variation relative signée en % (ex: +2.3). Optionnel. */
  trend: z.number().optional(),
  severity: z.enum(["ok", "warn", "alert"]).optional(),
});

/** Une métrique affichée dans le widget de l'app (max 6 par summary). */
export const HubMetricSchema = MesureSchema.extend({
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
  primary: z.boolean().optional(),
});

/**
 * Une ligne de la vue détaillée (additif v1.3). Même forme qu'une métrique, plus une
 * précision courte — et sans `primary` : une ligne de détail n'est jamais le titre d'une
 * carte, sinon le plafond de 6 métriques ne voudrait plus rien dire.
 */
export const HubDetailItemSchema = MesureSchema.extend({
  /**
   * Précision affichée sous la valeur : l'unité, la période couverte, la base d'un
   * pourcentage. C'est ce qui empêche « +4,2 % » d'être ambigu — +4,2 % depuis quand, sur
   * quoi ? Un chiffre dont on ne peut pas dire ce qu'il mesure vaut moins qu'aucun chiffre.
   */
  hint: z.string().max(80).optional(),
});

/**
 * Un groupe de lignes de détail, affiché comme un bloc titré (additif v1.3).
 *
 * `min(1)` sur `items` est délibéré : une section vide est un titre au-dessus de rien. Le
 * hub rendrait un encadré vide, ce qui ressemble à une donnée qui n'a pas chargé — alors
 * que le producteur a simplement publié une coquille. Mieux vaut refuser la section.
 */
export const HubDetailSectionSchema = z.object({
  title: z.string().min(1).max(40),
  items: z.array(HubDetailItemSchema).min(1).max(8),
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
 * LA prochaine chose à faire, selon l'app (additif v1.3, optionnel).
 *
 * ── POURQUOI UN CHAMP, ET PAS UNE ALERTE ─────────────────────────────────────────────
 *
 * La tentation était de réutiliser `alerts` avec une `severity: "info"` — zéro changement
 * de contrat. C'est ce qui a été écarté, parce qu'une alerte et une recommandation ne
 * répondent pas à la même question. Une alerte dit **ce qui va mal** ; une recommandation
 * dit **ce qu'il y a de mieux à faire**, et le plus souvent rien ne va mal. Les fondre
 * laisse deux issues, mauvaises toutes les deux : soit un bon conseil s'affiche avec la
 * mise en forme d'un problème, soit la liste des problèmes se dilue de conseils et on
 * apprend à ne plus la lire.
 *
 * ── UNE SEULE, PAS UN TABLEAU ────────────────────────────────────────────────────────
 *
 * Volontairement singulier. Un tableau de recommandations serait rempli — cinq conseils
 * classés par une app qui ne voit qu'elle-même — et un tableau de bord qui en affiche cinq
 * n'en affiche aucune : le lecteur arbitre, donc ne fait rien. Le producteur est obligé de
 * choisir, ce qui est précisément le travail qu'on lui demande. Le détail vit dans l'app,
 * au bout du `href`.
 */
export const HubRecommendationSchema = z.object({
  /** L'action, à l'impératif et chiffrée quand c'est possible. */
  label: z.string().min(1).max(80),
  /** Pourquoi, en une phrase. Une recommandation sans raison ne se vérifie pas. */
  why: z.string().min(1).max(140).optional(),
  /** Deep link vers l'écran où l'on fait la chose. */
  href: z.string().url().optional(),
});

/**
 * Le payload complet renvoyé par `GET .../hub/summary`.
 * C'est LE contrat : le hub ne connaît rien d'autre des apps.
 *
 * ⚠️ Ce schéma reste un `ZodObject` PUR — aucun `.superRefine` à ce niveau. Les
 * consommateurs et les tests s'appuient sur `.omit()` / `.extend()` (cf. le test de
 * stripping, qui simule un consommateur épinglé sur un tag antérieur), et un `.superRefine`
 * transformerait le schéma en `ZodEffects`, où ces méthodes n'existent pas. Les cohérences
 * qui portent sur UN champ vivent donc sur ce champ (voir les `refine` sur `metrics` et
 * `details`), et la seule qui relie DEUX champs frères est vérifiée dans `validateSummary`.
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
  expectedMaxAgeSec: z.number().int().positive().max(2_592_000).optional(),
  /** "building" = app en développement, moteur pas encore actif. */
  status: z.enum(["ok", "degraded", "error", "building"]),
  metrics: z
    .array(HubMetricSchema)
    .max(6)
    // Deux métriques « principales » ne désignent plus rien : le hub devrait en choisir une,
    // donc redeviner. Refuser ici force le producteur à trancher, ce qui est son travail.
    .refine(
      (metriques) => metriques.filter((m) => m.primary === true).length <= 1,
      { message: "au plus une métrique peut porter primary: true" },
    ),
  alerts: z.array(HubAlertSchema).max(10),
  actions: z.array(HubActionSchema).max(6),
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
  details: z
    .array(HubDetailSectionSchema)
    .max(6)
    .refine(
      (sections) => new Set(sections.map((s) => s.title)).size === sections.length,
      { message: "deux sections de détail ne peuvent pas porter le même titre" },
    )
    .refine(
      (sections) =>
        sections.every(
          (s) => new Set(s.items.map((i) => i.label)).size === s.items.length,
        ),
      { message: "deux lignes d'une même section ne peuvent pas porter le même libellé" },
    )
    .optional(),
  /** LA prochaine chose à faire selon l'app (additif v1.3, optionnel). */
  recommendation: HubRecommendationSchema.optional(),
  /** Coûts & quotas de l'app (additif v1.1 ; optionnel — les consumers v1.0 l'ignorent). */
  usage: HubUsageSchema.optional(),
});

export type HubMetric = z.infer<typeof HubMetricSchema>;
export type HubAlert = z.infer<typeof HubAlertSchema>;
export type HubAction = z.infer<typeof HubActionSchema>;
export type HubQuota = z.infer<typeof HubQuotaSchema>;
export type HubUsage = z.infer<typeof HubUsageSchema>;
export type HubDetailItem = z.infer<typeof HubDetailItemSchema>;
export type HubDetailSection = z.infer<typeof HubDetailSectionSchema>;
export type HubRecommendation = z.infer<typeof HubRecommendationSchema>;
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
 * Les cohérences qui relient DEUX champs frères, donc invérifiables depuis l'un d'eux.
 *
 * Elles vivent ici plutôt qu'en `.superRefine` sur `HubSummarySchema` pour la raison écrite
 * en tête de ce schéma : le garder `ZodObject` préserve `.omit()` / `.extend()`, dont
 * dépendent les tests et tout consommateur qui simule un tag antérieur.
 *
 * ⚠️ Conséquence à connaître : un appel DIRECT à `HubSummarySchema.safeParse` ne les
 * exécute pas. `validateSummary` est la seule porte complète — et c'est celle que le hub et
 * les cinq apps empruntent déjà (`serveSummary` l'appelle avant d'émettre).
 */
function verifierCoherences(summary: HubSummary): HubSummary {
  // Un âge maximal attendu sans horodatage à comparer ne mesure rien. Le laisser passer
  // serait pire qu'inutile : le producteur croirait sa fraîcheur surveillée, et le hub
  // n'aurait rien à surveiller. Personne ne verrait l'écart — c'est la forme exacte du
  // mode de panne que ce champ est censé fermer.
  if (summary.expectedMaxAgeSec !== undefined && summary.dataAsOf === undefined) {
    throw new Error(
      "HubSummary invalide (1 issue) — expectedMaxAgeSec: sans dataAsOf, aucun âge n'est " +
        "mesurable. Publier les deux, ou aucun des deux.",
    );
  }
  return summary;
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
    return verifierCoherences(result.data);
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
