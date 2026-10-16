import { z } from 'zod';

/**
 * Version du contrat. Toute rupture de compatibilité = bump + nouveau tag.
 * Les changements additifs optionnels (nouveau champ `.optional()`) ne bumpent
 * PAS cette constante — voir CLAUDE.md pour les règles d'évolution.
 */
declare const CONTRACT_VERSION = 1;
/**
 * Header HTTP que le hub envoie à chaque requête `GET .../hub/summary`.
 * Une app DOIT répondre 401 si le token est absent ou invalide.
 */
declare const HUB_TOKEN_HEADER = "x-hub-token";
/** Une métrique affichée dans le widget de l'app (max 6 par summary). */
declare const HubMetricSchema: z.ZodObject<{
    label: z.ZodString;
    value: z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>;
    format: z.ZodEnum<{
        number: "number";
        currency: "currency";
        percent: "percent";
        text: "text";
    }>;
    trend: z.ZodOptional<z.ZodNumber>;
    severity: z.ZodOptional<z.ZodEnum<{
        ok: "ok";
        warn: "warn";
        alert: "alert";
    }>>;
    primary: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Une ligne de la vue détaillée (additif v1.3). Même forme qu'une métrique, plus une
 * précision courte — et sans `primary` : une ligne de détail n'est jamais le titre d'une
 * carte, sinon le plafond de 6 métriques ne voudrait plus rien dire.
 */
declare const HubDetailItemSchema: z.ZodObject<{
    label: z.ZodString;
    value: z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>;
    format: z.ZodEnum<{
        number: "number";
        currency: "currency";
        percent: "percent";
        text: "text";
    }>;
    trend: z.ZodOptional<z.ZodNumber>;
    severity: z.ZodOptional<z.ZodEnum<{
        ok: "ok";
        warn: "warn";
        alert: "alert";
    }>>;
    hint: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Un groupe de lignes de détail, affiché comme un bloc titré (additif v1.3).
 *
 * `min(1)` sur `items` est délibéré : une section vide est un titre au-dessus de rien. Le
 * hub rendrait un encadré vide, ce qui ressemble à une donnée qui n'a pas chargé — alors
 * que le producteur a simplement publié une coquille. Mieux vaut refuser la section.
 */
declare const HubDetailSectionSchema: z.ZodObject<{
    title: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>;
        format: z.ZodEnum<{
            number: "number";
            currency: "currency";
            percent: "percent";
            text: "text";
        }>;
        trend: z.ZodOptional<z.ZodNumber>;
        severity: z.ZodOptional<z.ZodEnum<{
            ok: "ok";
            warn: "warn";
            alert: "alert";
        }>>;
        hint: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/** Une alerte remontée au hub (max 10 par summary). */
declare const HubAlertSchema: z.ZodObject<{
    label: z.ZodString;
    severity: z.ZodEnum<{
        warn: "warn";
        alert: "alert";
        info: "info";
    }>;
    href: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/** Une action proposée par l'app dans son widget (max 6 par summary). */
declare const HubActionSchema: z.ZodObject<{
    label: z.ZodString;
    kind: z.ZodEnum<{
        link: "link";
        trigger: "trigger";
    }>;
    href: z.ZodString;
    confirm: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/** État d'un quota d'API/service consommé par l'app (carte « Coûts & quotas » du hub). */
declare const HubQuotaSchema: z.ZodObject<{
    label: z.ZodString;
    used: z.ZodNumber;
    limit: z.ZodNullable<z.ZodNumber>;
    unit: z.ZodOptional<z.ZodString>;
    resetAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
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
declare const HubUsageSchema: z.ZodObject<{
    cost: z.ZodOptional<z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodEnum<{
            USD: "USD";
            CAD: "CAD";
        }>;
        period: z.ZodEnum<{
            total: "total";
            mois: "mois";
            jour: "jour";
        }>;
    }, z.core.$strip>>;
    quotas: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        used: z.ZodNumber;
        limit: z.ZodNullable<z.ZodNumber>;
        unit: z.ZodOptional<z.ZodString>;
        resetAt: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
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
declare const HubRecommendationSchema: z.ZodObject<{
    label: z.ZodString;
    why: z.ZodOptional<z.ZodString>;
    href: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
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
declare const HubSummarySchema: z.ZodObject<{
    contractVersion: z.ZodNumber;
    app: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        url: z.ZodString;
        color: z.ZodString;
    }, z.core.$strip>;
    generatedAt: z.ZodString;
    dataAsOf: z.ZodOptional<z.ZodString>;
    expectedMaxAgeSec: z.ZodOptional<z.ZodNumber>;
    status: z.ZodEnum<{
        error: "error";
        ok: "ok";
        degraded: "degraded";
        building: "building";
    }>;
    metrics: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>;
        format: z.ZodEnum<{
            number: "number";
            currency: "currency";
            percent: "percent";
            text: "text";
        }>;
        trend: z.ZodOptional<z.ZodNumber>;
        severity: z.ZodOptional<z.ZodEnum<{
            ok: "ok";
            warn: "warn";
            alert: "alert";
        }>>;
        primary: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    alerts: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        severity: z.ZodEnum<{
            warn: "warn";
            alert: "alert";
            info: "info";
        }>;
        href: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    actions: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        kind: z.ZodEnum<{
            link: "link";
            trigger: "trigger";
        }>;
        href: z.ZodString;
        confirm: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    details: z.ZodOptional<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        items: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>;
            format: z.ZodEnum<{
                number: "number";
                currency: "currency";
                percent: "percent";
                text: "text";
            }>;
            trend: z.ZodOptional<z.ZodNumber>;
            severity: z.ZodOptional<z.ZodEnum<{
                ok: "ok";
                warn: "warn";
                alert: "alert";
            }>>;
            hint: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    recommendation: z.ZodOptional<z.ZodObject<{
        label: z.ZodString;
        why: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    usage: z.ZodOptional<z.ZodObject<{
        cost: z.ZodOptional<z.ZodObject<{
            amount: z.ZodNumber;
            currency: z.ZodEnum<{
                USD: "USD";
                CAD: "CAD";
            }>;
            period: z.ZodEnum<{
                total: "total";
                mois: "mois";
                jour: "jour";
            }>;
        }, z.core.$strip>>;
        quotas: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            used: z.ZodNumber;
            limit: z.ZodNullable<z.ZodNumber>;
            unit: z.ZodOptional<z.ZodString>;
            resetAt: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
type HubMetric = z.infer<typeof HubMetricSchema>;
type HubAlert = z.infer<typeof HubAlertSchema>;
type HubAction = z.infer<typeof HubActionSchema>;
type HubQuota = z.infer<typeof HubQuotaSchema>;
type HubUsage = z.infer<typeof HubUsageSchema>;
type HubDetailItem = z.infer<typeof HubDetailItemSchema>;
type HubDetailSection = z.infer<typeof HubDetailSectionSchema>;
type HubRecommendation = z.infer<typeof HubRecommendationSchema>;
type HubSummary = z.infer<typeof HubSummarySchema>;
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
declare class ContractTooNewError extends Error {
    /** Version annoncée par l'app. */
    readonly published: number;
    /** Version maximale que ce build sait lire. */
    readonly supported: number;
    constructor(published: number, supported: number);
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
declare function validateSummary(data: unknown): HubSummary;
/**
 * Fabrique un summary minimal honnête pour une app encore en développement :
 * status "building", aucune métrique, une seule alerte info, aucune action.
 * Le résultat est validé contre le contrat avant d'être retourné.
 */
declare function buildingSummary(app: HubSummary["app"], opts?: {
    alertLabel?: string;
}): HubSummary;

export { CONTRACT_VERSION, ContractTooNewError, HUB_TOKEN_HEADER, type HubAction, HubActionSchema, type HubAlert, HubAlertSchema, type HubDetailItem, HubDetailItemSchema, type HubDetailSection, HubDetailSectionSchema, type HubMetric, HubMetricSchema, type HubQuota, HubQuotaSchema, type HubRecommendation, HubRecommendationSchema, type HubSummary, HubSummarySchema, type HubUsage, HubUsageSchema, buildingSummary, validateSummary };
