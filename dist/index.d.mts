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
    value: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
    format: z.ZodEnum<["currency", "percent", "number", "text"]>;
    /** Variation relative signée en % (ex: +2.3). Optionnel. */
    trend: z.ZodOptional<z.ZodNumber>;
    severity: z.ZodOptional<z.ZodEnum<["ok", "warn", "alert"]>>;
} & {
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
    primary: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    value: string | number;
    label: string;
    format: "number" | "currency" | "percent" | "text";
    trend?: number | undefined;
    severity?: "ok" | "warn" | "alert" | undefined;
    primary?: boolean | undefined;
}, {
    value: string | number;
    label: string;
    format: "number" | "currency" | "percent" | "text";
    trend?: number | undefined;
    severity?: "ok" | "warn" | "alert" | undefined;
    primary?: boolean | undefined;
}>;
/**
 * Une ligne de la vue détaillée (additif v1.3). Même forme qu'une métrique, plus une
 * précision courte — et sans `primary` : une ligne de détail n'est jamais le titre d'une
 * carte, sinon le plafond de 6 métriques ne voudrait plus rien dire.
 */
declare const HubDetailItemSchema: z.ZodObject<{
    label: z.ZodString;
    value: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
    format: z.ZodEnum<["currency", "percent", "number", "text"]>;
    /** Variation relative signée en % (ex: +2.3). Optionnel. */
    trend: z.ZodOptional<z.ZodNumber>;
    severity: z.ZodOptional<z.ZodEnum<["ok", "warn", "alert"]>>;
} & {
    /**
     * Précision affichée sous la valeur : l'unité, la période couverte, la base d'un
     * pourcentage. C'est ce qui empêche « +4,2 % » d'être ambigu — +4,2 % depuis quand, sur
     * quoi ? Un chiffre dont on ne peut pas dire ce qu'il mesure vaut moins qu'aucun chiffre.
     */
    hint: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    value: string | number;
    label: string;
    format: "number" | "currency" | "percent" | "text";
    trend?: number | undefined;
    severity?: "ok" | "warn" | "alert" | undefined;
    hint?: string | undefined;
}, {
    value: string | number;
    label: string;
    format: "number" | "currency" | "percent" | "text";
    trend?: number | undefined;
    severity?: "ok" | "warn" | "alert" | undefined;
    hint?: string | undefined;
}>;
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
        value: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
        format: z.ZodEnum<["currency", "percent", "number", "text"]>;
        /** Variation relative signée en % (ex: +2.3). Optionnel. */
        trend: z.ZodOptional<z.ZodNumber>;
        severity: z.ZodOptional<z.ZodEnum<["ok", "warn", "alert"]>>;
    } & {
        /**
         * Précision affichée sous la valeur : l'unité, la période couverte, la base d'un
         * pourcentage. C'est ce qui empêche « +4,2 % » d'être ambigu — +4,2 % depuis quand, sur
         * quoi ? Un chiffre dont on ne peut pas dire ce qu'il mesure vaut moins qu'aucun chiffre.
         */
        hint: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        value: string | number;
        label: string;
        format: "number" | "currency" | "percent" | "text";
        trend?: number | undefined;
        severity?: "ok" | "warn" | "alert" | undefined;
        hint?: string | undefined;
    }, {
        value: string | number;
        label: string;
        format: "number" | "currency" | "percent" | "text";
        trend?: number | undefined;
        severity?: "ok" | "warn" | "alert" | undefined;
        hint?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    title: string;
    items: {
        value: string | number;
        label: string;
        format: "number" | "currency" | "percent" | "text";
        trend?: number | undefined;
        severity?: "ok" | "warn" | "alert" | undefined;
        hint?: string | undefined;
    }[];
}, {
    title: string;
    items: {
        value: string | number;
        label: string;
        format: "number" | "currency" | "percent" | "text";
        trend?: number | undefined;
        severity?: "ok" | "warn" | "alert" | undefined;
        hint?: string | undefined;
    }[];
}>;
/** Une alerte remontée au hub (max 10 par summary). */
declare const HubAlertSchema: z.ZodObject<{
    label: z.ZodString;
    severity: z.ZodEnum<["info", "warn", "alert"]>;
    /** Deep link vers l'écran concerné dans l'app. */
    href: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    label: string;
    severity: "warn" | "alert" | "info";
    href?: string | undefined;
}, {
    label: string;
    severity: "warn" | "alert" | "info";
    href?: string | undefined;
}>;
/** Une action proposée par l'app dans son widget (max 6 par summary). */
declare const HubActionSchema: z.ZodObject<{
    label: z.ZodString;
    /** "link" = deep link (v1). "trigger" = webhook POST (réservé v2, ne pas implémenter côté apps). */
    kind: z.ZodEnum<["link", "trigger"]>;
    href: z.ZodString;
    /** Si présent, le hub demande confirmation avant d'exécuter. */
    confirm: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    label: string;
    href: string;
    kind: "link" | "trigger";
    confirm?: string | undefined;
}, {
    label: string;
    href: string;
    kind: "link" | "trigger";
    confirm?: string | undefined;
}>;
/** État d'un quota d'API/service consommé par l'app (carte « Coûts & quotas » du hub). */
declare const HubQuotaSchema: z.ZodObject<{
    label: z.ZodString;
    /** Quantité consommée sur la période. */
    used: z.ZodNumber;
    /** Plafond connu ; null si l'app ne connaît pas de limite chiffrée. */
    limit: z.ZodNullable<z.ZodNumber>;
    /** Unité affichée (ex: "appels", "Go", "courriels"). Optionnel. */
    unit: z.ZodOptional<z.ZodString>;
    /** Quand le compteur se réinitialise (ex: quota quotidien). Optionnel. */
    resetAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    label: string;
    used: number;
    limit: number | null;
    unit?: string | undefined;
    resetAt?: string | undefined;
}, {
    label: string;
    used: number;
    limit: number | null;
    unit?: string | undefined;
    resetAt?: string | undefined;
}>;
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
        /** Montant dépensé (≥ 0), dans la devise indiquée. */
        amount: z.ZodNumber;
        currency: z.ZodEnum<["USD", "CAD"]>;
        /** Portée du montant : cumulé, ce mois-ci, ou aujourd'hui. */
        period: z.ZodEnum<["total", "mois", "jour"]>;
    }, "strip", z.ZodTypeAny, {
        currency: "USD" | "CAD";
        amount: number;
        period: "total" | "mois" | "jour";
    }, {
        currency: "USD" | "CAD";
        amount: number;
        period: "total" | "mois" | "jour";
    }>>;
    quotas: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        /** Quantité consommée sur la période. */
        used: z.ZodNumber;
        /** Plafond connu ; null si l'app ne connaît pas de limite chiffrée. */
        limit: z.ZodNullable<z.ZodNumber>;
        /** Unité affichée (ex: "appels", "Go", "courriels"). Optionnel. */
        unit: z.ZodOptional<z.ZodString>;
        /** Quand le compteur se réinitialise (ex: quota quotidien). Optionnel. */
        resetAt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        used: number;
        limit: number | null;
        unit?: string | undefined;
        resetAt?: string | undefined;
    }, {
        label: string;
        used: number;
        limit: number | null;
        unit?: string | undefined;
        resetAt?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    cost?: {
        currency: "USD" | "CAD";
        amount: number;
        period: "total" | "mois" | "jour";
    } | undefined;
    quotas?: {
        label: string;
        used: number;
        limit: number | null;
        unit?: string | undefined;
        resetAt?: string | undefined;
    }[] | undefined;
}, {
    cost?: {
        currency: "USD" | "CAD";
        amount: number;
        period: "total" | "mois" | "jour";
    } | undefined;
    quotas?: {
        label: string;
        used: number;
        limit: number | null;
        unit?: string | undefined;
        resetAt?: string | undefined;
    }[] | undefined;
}>;
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
    /** L'action, à l'impératif et chiffrée quand c'est possible. */
    label: z.ZodString;
    /** Pourquoi, en une phrase. Une recommandation sans raison ne se vérifie pas. */
    why: z.ZodOptional<z.ZodString>;
    /** Deep link vers l'écran où l'on fait la chose. */
    href: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    label: string;
    href?: string | undefined;
    why?: string | undefined;
}, {
    label: string;
    href?: string | undefined;
    why?: string | undefined;
}>;
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
    /**
     * Version du format de fil publiée par l'app. Volontairement PAS un `z.literal` :
     * voir `validateSummary`, qui sonde ce champ AVANT la structure pour pouvoir dire
     * « trop récent » au lieu de « invalide ».
     */
    contractVersion: z.ZodNumber;
    app: z.ZodObject<{
        /** Identifiant stable de l'app, kebab-case (ex: "financeai", "drive-ai"). */
        id: z.ZodString;
        name: z.ZodString;
        url: z.ZodString;
        /** Couleur d'accent du widget, hex 6 digits. */
        color: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        url: string;
        color: string;
    }, {
        id: string;
        name: string;
        url: string;
        color: string;
    }>;
    /** Quand ce JSON a été généré. */
    generatedAt: z.ZodString;
    /** Fraîcheur des données sous-jacentes si différente de generatedAt
        (ex: dernière synchronisation d'état). */
    dataAsOf: z.ZodOptional<z.ZodString>;
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
    expectedMaxAgeSec: z.ZodOptional<z.ZodNumber>;
    /** "building" = app en développement, moteur pas encore actif. */
    status: z.ZodEnum<["ok", "degraded", "error", "building"]>;
    metrics: z.ZodEffects<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
        format: z.ZodEnum<["currency", "percent", "number", "text"]>;
        /** Variation relative signée en % (ex: +2.3). Optionnel. */
        trend: z.ZodOptional<z.ZodNumber>;
        severity: z.ZodOptional<z.ZodEnum<["ok", "warn", "alert"]>>;
    } & {
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
        primary: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        value: string | number;
        label: string;
        format: "number" | "currency" | "percent" | "text";
        trend?: number | undefined;
        severity?: "ok" | "warn" | "alert" | undefined;
        primary?: boolean | undefined;
    }, {
        value: string | number;
        label: string;
        format: "number" | "currency" | "percent" | "text";
        trend?: number | undefined;
        severity?: "ok" | "warn" | "alert" | undefined;
        primary?: boolean | undefined;
    }>, "many">, {
        value: string | number;
        label: string;
        format: "number" | "currency" | "percent" | "text";
        trend?: number | undefined;
        severity?: "ok" | "warn" | "alert" | undefined;
        primary?: boolean | undefined;
    }[], {
        value: string | number;
        label: string;
        format: "number" | "currency" | "percent" | "text";
        trend?: number | undefined;
        severity?: "ok" | "warn" | "alert" | undefined;
        primary?: boolean | undefined;
    }[]>;
    alerts: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        severity: z.ZodEnum<["info", "warn", "alert"]>;
        /** Deep link vers l'écran concerné dans l'app. */
        href: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        severity: "warn" | "alert" | "info";
        href?: string | undefined;
    }, {
        label: string;
        severity: "warn" | "alert" | "info";
        href?: string | undefined;
    }>, "many">;
    actions: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        /** "link" = deep link (v1). "trigger" = webhook POST (réservé v2, ne pas implémenter côté apps). */
        kind: z.ZodEnum<["link", "trigger"]>;
        href: z.ZodString;
        /** Si présent, le hub demande confirmation avant d'exécuter. */
        confirm: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        href: string;
        kind: "link" | "trigger";
        confirm?: string | undefined;
    }, {
        label: string;
        href: string;
        kind: "link" | "trigger";
        confirm?: string | undefined;
    }>, "many">;
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
    details: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        items: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
            format: z.ZodEnum<["currency", "percent", "number", "text"]>;
            /** Variation relative signée en % (ex: +2.3). Optionnel. */
            trend: z.ZodOptional<z.ZodNumber>;
            severity: z.ZodOptional<z.ZodEnum<["ok", "warn", "alert"]>>;
        } & {
            /**
             * Précision affichée sous la valeur : l'unité, la période couverte, la base d'un
             * pourcentage. C'est ce qui empêche « +4,2 % » d'être ambigu — +4,2 % depuis quand, sur
             * quoi ? Un chiffre dont on ne peut pas dire ce qu'il mesure vaut moins qu'aucun chiffre.
             */
            hint: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            value: string | number;
            label: string;
            format: "number" | "currency" | "percent" | "text";
            trend?: number | undefined;
            severity?: "ok" | "warn" | "alert" | undefined;
            hint?: string | undefined;
        }, {
            value: string | number;
            label: string;
            format: "number" | "currency" | "percent" | "text";
            trend?: number | undefined;
            severity?: "ok" | "warn" | "alert" | undefined;
            hint?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        title: string;
        items: {
            value: string | number;
            label: string;
            format: "number" | "currency" | "percent" | "text";
            trend?: number | undefined;
            severity?: "ok" | "warn" | "alert" | undefined;
            hint?: string | undefined;
        }[];
    }, {
        title: string;
        items: {
            value: string | number;
            label: string;
            format: "number" | "currency" | "percent" | "text";
            trend?: number | undefined;
            severity?: "ok" | "warn" | "alert" | undefined;
            hint?: string | undefined;
        }[];
    }>, "many">, {
        title: string;
        items: {
            value: string | number;
            label: string;
            format: "number" | "currency" | "percent" | "text";
            trend?: number | undefined;
            severity?: "ok" | "warn" | "alert" | undefined;
            hint?: string | undefined;
        }[];
    }[], {
        title: string;
        items: {
            value: string | number;
            label: string;
            format: "number" | "currency" | "percent" | "text";
            trend?: number | undefined;
            severity?: "ok" | "warn" | "alert" | undefined;
            hint?: string | undefined;
        }[];
    }[]>, {
        title: string;
        items: {
            value: string | number;
            label: string;
            format: "number" | "currency" | "percent" | "text";
            trend?: number | undefined;
            severity?: "ok" | "warn" | "alert" | undefined;
            hint?: string | undefined;
        }[];
    }[], {
        title: string;
        items: {
            value: string | number;
            label: string;
            format: "number" | "currency" | "percent" | "text";
            trend?: number | undefined;
            severity?: "ok" | "warn" | "alert" | undefined;
            hint?: string | undefined;
        }[];
    }[]>>;
    /** LA prochaine chose à faire selon l'app (additif v1.3, optionnel). */
    recommendation: z.ZodOptional<z.ZodObject<{
        /** L'action, à l'impératif et chiffrée quand c'est possible. */
        label: z.ZodString;
        /** Pourquoi, en une phrase. Une recommandation sans raison ne se vérifie pas. */
        why: z.ZodOptional<z.ZodString>;
        /** Deep link vers l'écran où l'on fait la chose. */
        href: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        href?: string | undefined;
        why?: string | undefined;
    }, {
        label: string;
        href?: string | undefined;
        why?: string | undefined;
    }>>;
    /** Coûts & quotas de l'app (additif v1.1 ; optionnel — les consumers v1.0 l'ignorent). */
    usage: z.ZodOptional<z.ZodObject<{
        cost: z.ZodOptional<z.ZodObject<{
            /** Montant dépensé (≥ 0), dans la devise indiquée. */
            amount: z.ZodNumber;
            currency: z.ZodEnum<["USD", "CAD"]>;
            /** Portée du montant : cumulé, ce mois-ci, ou aujourd'hui. */
            period: z.ZodEnum<["total", "mois", "jour"]>;
        }, "strip", z.ZodTypeAny, {
            currency: "USD" | "CAD";
            amount: number;
            period: "total" | "mois" | "jour";
        }, {
            currency: "USD" | "CAD";
            amount: number;
            period: "total" | "mois" | "jour";
        }>>;
        quotas: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            /** Quantité consommée sur la période. */
            used: z.ZodNumber;
            /** Plafond connu ; null si l'app ne connaît pas de limite chiffrée. */
            limit: z.ZodNullable<z.ZodNumber>;
            /** Unité affichée (ex: "appels", "Go", "courriels"). Optionnel. */
            unit: z.ZodOptional<z.ZodString>;
            /** Quand le compteur se réinitialise (ex: quota quotidien). Optionnel. */
            resetAt: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            label: string;
            used: number;
            limit: number | null;
            unit?: string | undefined;
            resetAt?: string | undefined;
        }, {
            label: string;
            used: number;
            limit: number | null;
            unit?: string | undefined;
            resetAt?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        cost?: {
            currency: "USD" | "CAD";
            amount: number;
            period: "total" | "mois" | "jour";
        } | undefined;
        quotas?: {
            label: string;
            used: number;
            limit: number | null;
            unit?: string | undefined;
            resetAt?: string | undefined;
        }[] | undefined;
    }, {
        cost?: {
            currency: "USD" | "CAD";
            amount: number;
            period: "total" | "mois" | "jour";
        } | undefined;
        quotas?: {
            label: string;
            used: number;
            limit: number | null;
            unit?: string | undefined;
            resetAt?: string | undefined;
        }[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    contractVersion: number;
    status: "ok" | "degraded" | "error" | "building";
    app: {
        id: string;
        name: string;
        url: string;
        color: string;
    };
    generatedAt: string;
    metrics: {
        value: string | number;
        label: string;
        format: "number" | "currency" | "percent" | "text";
        trend?: number | undefined;
        severity?: "ok" | "warn" | "alert" | undefined;
        primary?: boolean | undefined;
    }[];
    alerts: {
        label: string;
        severity: "warn" | "alert" | "info";
        href?: string | undefined;
    }[];
    actions: {
        label: string;
        href: string;
        kind: "link" | "trigger";
        confirm?: string | undefined;
    }[];
    dataAsOf?: string | undefined;
    expectedMaxAgeSec?: number | undefined;
    details?: {
        title: string;
        items: {
            value: string | number;
            label: string;
            format: "number" | "currency" | "percent" | "text";
            trend?: number | undefined;
            severity?: "ok" | "warn" | "alert" | undefined;
            hint?: string | undefined;
        }[];
    }[] | undefined;
    recommendation?: {
        label: string;
        href?: string | undefined;
        why?: string | undefined;
    } | undefined;
    usage?: {
        cost?: {
            currency: "USD" | "CAD";
            amount: number;
            period: "total" | "mois" | "jour";
        } | undefined;
        quotas?: {
            label: string;
            used: number;
            limit: number | null;
            unit?: string | undefined;
            resetAt?: string | undefined;
        }[] | undefined;
    } | undefined;
}, {
    contractVersion: number;
    status: "ok" | "degraded" | "error" | "building";
    app: {
        id: string;
        name: string;
        url: string;
        color: string;
    };
    generatedAt: string;
    metrics: {
        value: string | number;
        label: string;
        format: "number" | "currency" | "percent" | "text";
        trend?: number | undefined;
        severity?: "ok" | "warn" | "alert" | undefined;
        primary?: boolean | undefined;
    }[];
    alerts: {
        label: string;
        severity: "warn" | "alert" | "info";
        href?: string | undefined;
    }[];
    actions: {
        label: string;
        href: string;
        kind: "link" | "trigger";
        confirm?: string | undefined;
    }[];
    dataAsOf?: string | undefined;
    expectedMaxAgeSec?: number | undefined;
    details?: {
        title: string;
        items: {
            value: string | number;
            label: string;
            format: "number" | "currency" | "percent" | "text";
            trend?: number | undefined;
            severity?: "ok" | "warn" | "alert" | undefined;
            hint?: string | undefined;
        }[];
    }[] | undefined;
    recommendation?: {
        label: string;
        href?: string | undefined;
        why?: string | undefined;
    } | undefined;
    usage?: {
        cost?: {
            currency: "USD" | "CAD";
            amount: number;
            period: "total" | "mois" | "jour";
        } | undefined;
        quotas?: {
            label: string;
            used: number;
            limit: number | null;
            unit?: string | undefined;
            resetAt?: string | undefined;
        }[] | undefined;
    } | undefined;
}>;
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
