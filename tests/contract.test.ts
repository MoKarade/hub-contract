import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  CONTRACT_VERSION,
  ContractTooNewError,
  HUB_TOKEN_HEADER,
  HubSummarySchema,
  buildingSummary,
  validateSummary,
  type HubSummary,
} from "../src/index";

const validApp: HubSummary["app"] = {
  id: "financeai",
  name: "FinanceAI",
  url: "https://finance.hubperso.com",
  color: "#0f766e",
};

function makeValidSummary(): HubSummary {
  return {
    contractVersion: CONTRACT_VERSION,
    app: { ...validApp },
    generatedAt: "2026-07-15T12:00:00.000Z",
    dataAsOf: "2026-07-15T11:55:00.000Z",
    status: "ok",
    metrics: [
      {
        label: "Valeur nette",
        value: 123456.78,
        format: "currency",
        trend: 2.3,
        severity: "ok",
      },
      { label: "Épargne du mois", value: "1 250 $", format: "text" },
    ],
    alerts: [
      {
        label: "Relevé bancaire en retard de 3 jours",
        severity: "warn",
        href: "https://finance.hubperso.com/imports",
      },
    ],
    actions: [
      {
        label: "Ouvrir FinanceAI",
        kind: "link",
        href: "https://finance.hubperso.com",
      },
      {
        label: "Lancer une synchro",
        kind: "trigger",
        href: "https://finance.hubperso.com/api/sync",
        confirm: "Lancer une synchronisation complète ?",
      },
    ],
  };
}

describe("validateSummary — cas valide", () => {
  it("accepte un summary complet et le retourne typé", () => {
    const summary = makeValidSummary();
    expect(validateSummary(summary)).toEqual(summary);
  });

  it("accepte un summary sans les champs optionnels", () => {
    const summary = makeValidSummary();
    delete summary.dataAsOf;
    summary.metrics = [{ label: "Docs indexés", value: 42, format: "number" }];
    summary.alerts = [];
    summary.actions = [];
    expect(() => validateSummary(summary)).not.toThrow();
  });

  it("accepte les bornes exactes : 6 metrics, 10 alerts, 6 actions", () => {
    const summary: HubSummary = {
      ...makeValidSummary(),
      metrics: Array.from({ length: 6 }, (_, i) => ({
        label: `Métrique ${i + 1}`,
        value: i,
        format: "number" as const,
      })),
      alerts: Array.from({ length: 10 }, (_, i) => ({
        label: `Alerte ${i + 1}`,
        severity: "info" as const,
      })),
      actions: Array.from({ length: 6 }, (_, i) => ({
        label: `Action ${i + 1}`,
        kind: "link" as const,
        href: `https://finance.hubperso.com/a/${i + 1}`,
      })),
    };
    expect(() => validateSummary(summary)).not.toThrow();
  });
});

describe("validateSummary — violations clés", () => {
  it("rejette un contractVersion trop RÉCENT, et le dit distinctement", () => {
    const summary = { ...makeValidSummary(), contractVersion: 2 };
    // Pas un `Error` générique : le hub doit pouvoir afficher « contrat trop récent » plutôt
    // qu'« invalide », qui accuserait l'app alors que c'est le consommateur à re-pinner.
    expect(() => validateSummary(summary)).toThrow(ContractTooNewError);
    expect(() => validateSummary(summary)).toThrow(/contractVersion/);
  });

  it("rejette un contractVersion absent, nul ou non entier", () => {
    for (const v of [undefined, 0, -1, 1.5, "1"]) {
      const summary = { ...makeValidSummary(), contractVersion: v };
      expect(() => validateSummary(summary)).toThrow();
    }
  });

  it("rejette une couleur qui n'est pas un hex 6 digits", () => {
    for (const color of ["teal", "#0f7", "#0f766ez", "#0f766e00", "0f766e"]) {
      const summary = makeValidSummary();
      summary.app.color = color;
      expect(() => validateSummary(summary), `color=${color}`).toThrow(
        /app\.color/,
      );
    }
  });

  it("rejette un generatedAt qui n'est pas un datetime ISO", () => {
    for (const generatedAt of ["hier", "2026-07-15", "15/07/2026 12:00"]) {
      const summary = { ...makeValidSummary(), generatedAt };
      expect(() => validateSummary(summary)).toThrow(/generatedAt/);
    }
  });

  it("exige un datetime UTC : les offsets timezone sont refusés", () => {
    for (const generatedAt of [
      "2026-07-15T12:00:00+02:00",
      "2026-07-15T12:00:00-05:00",
      "2026-07-15T12:00:00",
    ]) {
      const summary = { ...makeValidSummary(), generatedAt };
      expect(() => validateSummary(summary), generatedAt).toThrow(
        /generatedAt/,
      );
    }
  });

  it("rejette plus de 6 metrics", () => {
    const summary = makeValidSummary();
    summary.metrics = Array.from({ length: 7 }, (_, i) => ({
      label: `Métrique ${i + 1}`,
      value: i,
      format: "number" as const,
    }));
    expect(() => validateSummary(summary)).toThrow(/metrics/);
  });

  it("rejette un app.id avec des majuscules", () => {
    const summary = makeValidSummary();
    summary.app.id = "FinanceAI";
    expect(() => validateSummary(summary)).toThrow(/app\.id/);
  });

  it("rejette plus de 10 alerts et plus de 6 actions", () => {
    const tooManyAlerts = makeValidSummary();
    tooManyAlerts.alerts = Array.from({ length: 11 }, (_, i) => ({
      label: `Alerte ${i + 1}`,
      severity: "info" as const,
    }));
    expect(() => validateSummary(tooManyAlerts)).toThrow(/alerts/);

    const tooManyActions = makeValidSummary();
    tooManyActions.actions = Array.from({ length: 7 }, (_, i) => ({
      label: `Action ${i + 1}`,
      kind: "link" as const,
      href: `https://finance.hubperso.com/a/${i + 1}`,
    }));
    expect(() => validateSummary(tooManyActions)).toThrow(/actions/);
  });

  it("rejette un href d'action qui n'est pas une URL", () => {
    const summary = makeValidSummary();
    summary.actions = [{ label: "Ouvrir", kind: "link", href: "/relatif" }];
    expect(() => validateSummary(summary)).toThrow(/actions\.0\.href/);
  });

  it("liste toutes les issues dans le message d'erreur", () => {
    const summary = makeValidSummary();
    summary.app.id = "Nope!";
    summary.app.color = "rouge";
    try {
      validateSummary(summary);
      expect.unreachable("validateSummary aurait dû jeter");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("HubSummary invalide");
      expect(message).toContain("app.id");
      expect(message).toContain("app.color");
    }
  });

  it("rejette les payloads qui ne sont pas des objets", () => {
    for (const data of [null, undefined, 42, "json", []]) {
      expect(() => validateSummary(data)).toThrow(/HubSummary invalide/);
    }
  });

  it.each<[string, () => unknown, RegExp]>([
    [
      "app.url pas une URL",
      () => {
        const s = makeValidSummary();
        return { ...s, app: { ...s.app, url: "pas-une-url" } };
      },
      /app\.url/,
    ],
    [
      "app.name trop long (31 caractères)",
      () => {
        const s = makeValidSummary();
        return { ...s, app: { ...s.app, name: "x".repeat(31) } };
      },
      /app\.name/,
    ],
    [
      "label de metric vide",
      () => ({
        ...makeValidSummary(),
        metrics: [{ label: "", value: 1, format: "number" }],
      }),
      /metrics\.0\.label/,
    ],
    [
      "label de metric trop long (41 caractères)",
      () => ({
        ...makeValidSummary(),
        metrics: [{ label: "x".repeat(41), value: 1, format: "number" }],
      }),
      /metrics\.0\.label/,
    ],
    [
      "label d'alerte trop long (81 caractères)",
      () => ({
        ...makeValidSummary(),
        alerts: [{ label: "x".repeat(81), severity: "info" }],
      }),
      /alerts\.0\.label/,
    ],
    [
      "label d'action trop long (41 caractères)",
      () => ({
        ...makeValidSummary(),
        actions: [
          {
            label: "x".repeat(41),
            kind: "link",
            href: "https://finance.hubperso.com",
          },
        ],
      }),
      /actions\.0\.label/,
    ],
    [
      "status hors enum",
      () => ({ ...makeValidSummary(), status: "unknown" }),
      /status/,
    ],
    [
      "format de metric hors enum",
      () => ({
        ...makeValidSummary(),
        metrics: [{ label: "M", value: 1, format: "emoji" }],
      }),
      /metrics\.0\.format/,
    ],
    [
      "severity de metric hors enum (info est réservé aux alertes)",
      () => ({
        ...makeValidSummary(),
        metrics: [{ label: "M", value: 1, format: "number", severity: "info" }],
      }),
      /metrics\.0\.severity/,
    ],
    [
      "severity d'alerte hors enum (ok est réservé aux metrics)",
      () => ({
        ...makeValidSummary(),
        alerts: [{ label: "A", severity: "ok" }],
      }),
      /alerts\.0\.severity/,
    ],
    [
      "href d'alerte non-URL",
      () => ({
        ...makeValidSummary(),
        alerts: [{ label: "A", severity: "info", href: "/relatif" }],
      }),
      /alerts\.0\.href/,
    ],
    [
      "kind d'action hors enum",
      () => ({
        ...makeValidSummary(),
        actions: [
          { label: "A", kind: "open", href: "https://finance.hubperso.com" },
        ],
      }),
      /actions\.0\.kind/,
    ],
    [
      "dataAsOf invalide",
      () => ({ ...makeValidSummary(), dataAsOf: "hier" }),
      /dataAsOf/,
    ],
  ])("rejette : %s", (_name, make, pattern) => {
    expect(() => validateSummary(make())).toThrow(pattern);
  });

  it("détaille les branches d'union pour metric.value invalide", () => {
    const summary = makeValidSummary();
    summary.metrics = [
      { label: "Cassée", value: null as unknown as number, format: "number" },
    ];
    try {
      validateSummary(summary);
      expect.unreachable("validateSummary aurait dû jeter");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("metrics.0.value");
      expect(message).toContain("Expected number");
      expect(message).toContain("Expected string");
    }
  });
});

describe("évolution additive du contrat", () => {
  it("strippe les clés inconnues au lieu de rejeter — un hub v1 tolère un summary v1.x enrichi", () => {
    const summary = makeValidSummary();
    const enriched = {
      ...summary,
      champFuturOptionnel: "ajouté en v1.1",
      metrics: [
        { ...summary.metrics[0], nouveauChampMetric: 42 },
        summary.metrics[1],
      ],
    };
    const parsed = validateSummary(enriched);
    expect(parsed).not.toHaveProperty("champFuturOptionnel");
    expect(parsed.metrics[0]).not.toHaveProperty("nouveauChampMetric");
    expect(parsed).toEqual(summary);
  });
});

describe("buildingSummary", () => {
  it("produit un summary qui passe validateSummary", () => {
    const summary = buildingSummary(validApp);
    expect(() => validateSummary(summary)).not.toThrow();
    expect(HubSummarySchema.safeParse(summary).success).toBe(true);
  });

  it("est minimal et honnête : building, sans metrics ni actions, une alerte info", () => {
    const summary = buildingSummary(validApp);
    expect(summary.status).toBe("building");
    expect(summary.metrics).toEqual([]);
    expect(summary.actions).toEqual([]);
    expect(summary.alerts).toHaveLength(1);
    expect(summary.alerts[0]?.severity).toBe("info");
  });

  it("accepte un libellé d'alerte personnalisé", () => {
    const summary = buildingSummary(validApp, {
      alertLabel: "DriveAI arrive bientôt",
    });
    expect(summary.alerts[0]?.label).toBe("DriveAI arrive bientôt");
  });

  it("génère un generatedAt datetime ISO valide", () => {
    const summary = buildingSummary(validApp);
    expect(Number.isNaN(Date.parse(summary.generatedAt))).toBe(false);
  });

  it("rejette une app invalide plutôt que de produire un summary non conforme", () => {
    expect(() =>
      buildingSummary({ ...validApp, id: "Pas Kebab Case" }),
    ).toThrow(/app\.id/);
  });
});

describe("usage (coûts & quotas, additif v1.1)", () => {
  it("accepte un summary AVEC usage (coût + quotas)", () => {
    const s = validateSummary({
      ...makeValidSummary(),
      usage: {
        cost: { amount: 3.42, currency: "USD", period: "mois" },
        quotas: [{ label: "Gmail", used: 120, limit: 250, unit: "requêtes", resetAt: "2026-07-16T00:00:00.000Z" }],
      },
    });
    expect(s.usage?.cost?.amount).toBe(3.42);
    expect(s.usage?.quotas?.[0]?.limit).toBe(250);
  });

  it("usage reste OPTIONNEL (un summary sans usage est valide)", () => {
    const s = validateSummary(makeValidSummary());
    expect(s.usage).toBeUndefined();
  });

  it("quota sans limite connue : limit null admis", () => {
    const s = validateSummary({
      ...makeValidSummary(),
      usage: { quotas: [{ label: "Appels LLM", used: 42, limit: null }] },
    });
    expect(s.usage?.quotas?.[0]?.limit).toBeNull();
  });

  it("rejette une devise hors enum et un montant négatif", () => {
    expect(() =>
      validateSummary({ ...makeValidSummary(), usage: { cost: { amount: 1, currency: "EUR", period: "mois" } } }),
    ).toThrow(/usage\.cost\.currency/);
    expect(() =>
      validateSummary({ ...makeValidSummary(), usage: { cost: { amount: -1, currency: "USD", period: "mois" } } }),
    ).toThrow(/usage\.cost\.amount/);
  });
});

describe("constantes du contrat", () => {
  it("expose la version courante et le header d'auth", () => {
    expect(CONTRACT_VERSION).toBe(1);
    expect(HUB_TOKEN_HEADER).toBe("x-hub-token");
  });
});

describe("ContractTooNewError — le seul échec qui n'est pas la faute de l'app", () => {
  it("porte les deux versions, pour que le message dise quoi re-pinner", () => {
    const summary = { ...makeValidSummary(), contractVersion: 7 };
    try {
      validateSummary(summary);
      expect.unreachable("aurait dû jeter");
    } catch (e) {
      expect(e).toBeInstanceOf(ContractTooNewError);
      const err = e as ContractTooNewError;
      expect(err.published).toBe(7);
      expect(err.supported).toBe(CONTRACT_VERSION);
      expect(err.name).toBe("ContractTooNewError");
    }
  });

  it("la version est jugée AVANT la structure", () => {
    // Une version majeure peut légitimement retirer un champ. Si la structure était parsée
    // d'abord, l'erreur sortirait en « invalide » et le vrai diagnostic serait perdu.
    const casse = { contractVersion: 9, app: { id: "x" } };
    expect(() => validateSummary(casse)).toThrow(ContractTooNewError);
  });

  it("un summary à la version courante passe, lui", () => {
    const summary = { ...makeValidSummary(), contractVersion: CONTRACT_VERSION };
    expect(validateSummary(summary).contractVersion).toBe(CONTRACT_VERSION);
  });
});

describe("stripping de Zod : vérifier ce qui est RENDU, pas seulement que ça ne lève pas", () => {
  it("un champ inconnu est SILENCIEUSEMENT retiré du résultat", () => {
    const enrichi = { ...makeValidSummary(), champInconnuDuFutur: { a: 1 } };
    const rendu = validateSummary(enrichi) as Record<string, unknown>;

    // Le test qui compte : « ça n'a pas levé » est compatible avec « le champ a disparu ».
    expect(rendu.champInconnuDuFutur).toBeUndefined();
    expect("champInconnuDuFutur" in rendu).toBe(false);
  });

  it("usage entier disparaît chez un consommateur qui ne le connaît pas — démonstration", () => {
    // Reproduit ce qui arrive à une app épinglée AVANT la v1.1 : elle reçoit `usage`,
    // ne lève rien, et n'affiche aucun coût. Aucune erreur nulle part.
    const sansUsage = z.object({ contractVersion: z.number() }).passthrough().parse({
      ...makeValidSummary(),
      usage: { cost: { amount: 12, currency: "CAD", period: "total" } },
    });
    expect(sansUsage.usage).toBeDefined(); // le champ EST bien sur le fil…

    const consommateurAncien = HubSummarySchema.omit({ usage: true }).strip();
    const vu = consommateurAncien.parse(sansUsage) as Record<string, unknown>;
    expect(vu.usage).toBeUndefined(); // …et il a disparu à la lecture, sans un mot.
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────
// v1.3 — quatre ajouts additifs : details, primary, recommendation, expectedMaxAgeSec.
//
// Chaque bloc porte un cas VALIDE dont on compare ce qui est RENDU (Zod strippe : « ça n'a
// pas levé » est compatible avec « le champ a disparu ») et au moins un cas REJETÉ.
// ─────────────────────────────────────────────────────────────────────────────────────────

const sectionsValides: HubSummary["details"] = [
  {
    title: "Aujourd'hui",
    items: [
      { label: "Gagné", value: 210.5, format: "currency" },
      { label: "Dépensé", value: 68.2, format: "currency", severity: "warn" },
      {
        label: "Placements",
        value: 1.8,
        format: "percent",
        trend: 1.8,
        hint: "depuis la clôture de la veille",
      },
    ],
  },
  {
    title: "Depuis le début",
    items: [
      // MÊME libellé que dans la section précédente : c'est le cas qui prouve que la clé
      // est le COUPLE (section, libellé) et non le libellé seul.
      { label: "Placements", value: 230126, format: "currency", hint: "+18,4 % / +35 800 $" },
    ],
  },
];

describe("v1.3 — details (la vue détaillée)", () => {
  it("rend les sections INTACTES, hint compris", () => {
    const summary = { ...makeValidSummary(), details: sectionsValides };
    expect(validateSummary(summary).details).toEqual(sectionsValides);
  });

  it("accepte le même libellé dans DEUX sections différentes", () => {
    // Discriminant : si la contrainte d'unicité était posée sur le libellé seul au lieu du
    // couple, ce cas légitime — et le plus lisible — serait rejeté.
    const rendu = validateSummary({ ...makeValidSummary(), details: sectionsValides });
    expect(rendu.details?.[0]?.items[2]?.label).toBe("Placements");
    expect(rendu.details?.[1]?.items[0]?.label).toBe("Placements");
  });

  it("rejette deux sections qui portent le même titre", () => {
    const details = [sectionsValides![0]!, { ...sectionsValides![0]! }];
    expect(() => validateSummary({ ...makeValidSummary(), details })).toThrow(/même titre/);
  });

  it("rejette deux lignes homonymes DANS une même section", () => {
    const details = [
      {
        title: "Aujourd'hui",
        items: [
          { label: "Gagné", value: 1, format: "currency" as const },
          { label: "Gagné", value: 2, format: "currency" as const },
        ],
      },
    ];
    expect(() => validateSummary({ ...makeValidSummary(), details })).toThrow(/même libellé/);
  });

  it("rejette une section vide (un titre au-dessus de rien)", () => {
    const details = [{ title: "Aujourd'hui", items: [] }];
    expect(() => validateSummary({ ...makeValidSummary(), details })).toThrow(/details/);
  });

  it("rejette plus de 6 sections, et plus de 8 lignes par section", () => {
    const uneSection = (n: number) => ({
      title: `Section ${n}`,
      items: [{ label: "x", value: 1, format: "number" as const }],
    });
    expect(() =>
      validateSummary({
        ...makeValidSummary(),
        details: Array.from({ length: 7 }, (_, i) => uneSection(i)),
      }),
    ).toThrow(/details/);

    expect(() =>
      validateSummary({
        ...makeValidSummary(),
        details: [
          {
            title: "Trop",
            items: Array.from({ length: 9 }, (_, i) => ({
              label: `l${i}`,
              value: i,
              format: "number" as const,
            })),
          },
        ],
      }),
    ).toThrow(/details/);
  });

  it("une ligne de détail ne peut PAS se déclarer primary — le champ est retiré", () => {
    // Le plafond de 6 métriques protège la carte : une ligne de détail promue en titre le
    // contournerait. L'omission de `primary` dans le schéma de détail est ce qui l'empêche.
    const rendu = validateSummary({
      ...makeValidSummary(),
      details: [
        {
          title: "Aujourd'hui",
          items: [{ label: "Gagné", value: 1, format: "currency", primary: true }],
        },
      ],
    });
    expect(rendu.details?.[0]?.items[0]).not.toHaveProperty("primary");
  });

  it("un summary sans details reste valide (rétrocompatibilité v1.2)", () => {
    const rendu = validateSummary(makeValidSummary());
    expect(rendu.details).toBeUndefined();
  });
});

describe("v1.3 — primary (quelle métrique porte la grande tuile)", () => {
  it("rend primary: true sur la métrique désignée", () => {
    const summary = makeValidSummary();
    summary.metrics[0]!.primary = true;
    expect(validateSummary(summary).metrics[0]?.primary).toBe(true);
  });

  it("rejette DEUX métriques principales", () => {
    const summary = makeValidSummary();
    summary.metrics[0]!.primary = true;
    summary.metrics[1]!.primary = true;
    expect(() => validateSummary(summary)).toThrow(/au plus une métrique/);
  });

  it("aucune métrique principale reste valide — le hub retombe sur la première", () => {
    expect(validateSummary(makeValidSummary()).metrics[0]?.primary).toBeUndefined();
  });
});

describe("v1.3 — recommendation (la prochaine chose à faire)", () => {
  const reco = {
    label: "Verser 2 350 $ au CELI avant le 31 décembre",
    why: "Le cashflow mensuel le permet et le plafond expire à la fin de l'année.",
    href: "https://finance.hubperso.com/objectifs",
  };

  it("est rendue intacte", () => {
    expect(validateSummary({ ...makeValidSummary(), recommendation: reco }).recommendation).toEqual(
      reco,
    );
  });

  it("accepte une recommandation sans why ni href", () => {
    const nue = { label: "Rapprocher le relevé de septembre" };
    expect(
      validateSummary({ ...makeValidSummary(), recommendation: nue }).recommendation,
    ).toEqual(nue);
  });

  it("rejette un label vide, un why trop long, un href non http", () => {
    const base = makeValidSummary();
    expect(() => validateSummary({ ...base, recommendation: { label: "" } })).toThrow(
      /recommendation\.label/,
    );
    expect(() =>
      validateSummary({ ...base, recommendation: { label: "ok", why: "x".repeat(141) } }),
    ).toThrow(/recommendation\.why/);
    expect(() =>
      validateSummary({ ...base, recommendation: { label: "ok", href: "pas-une-url" } }),
    ).toThrow(/recommendation\.href/);
  });
});

describe("v1.3 — expectedMaxAgeSec (l'app déclare son propre rythme)", () => {
  it("est rendu quand dataAsOf est présent", () => {
    const summary = { ...makeValidSummary(), expectedMaxAgeSec: 3600 };
    expect(validateSummary(summary).expectedMaxAgeSec).toBe(3600);
  });

  it("REJETTE un âge attendu sans dataAsOf — il ne mesurerait rien", () => {
    // Le contrôle croisé de `verifierCoherences`. Sans lui, le producteur croirait sa
    // fraîcheur surveillée et le hub n'aurait rien à comparer : un faux sentiment de
    // surveillance, invisible des deux côtés.
    const { dataAsOf: _ignore, ...sansDate } = makeValidSummary();
    expect(() => validateSummary({ ...sansDate, expectedMaxAgeSec: 3600 })).toThrow(
      /sans dataAsOf/,
    );
  });

  it("rejette 0, un décimal et plus de 30 jours", () => {
    const base = makeValidSummary();
    for (const valeur of [0, -60, 1800.5, 2_592_001]) {
      expect(() => validateSummary({ ...base, expectedMaxAgeSec: valeur })).toThrow(
        /expectedMaxAgeSec/,
      );
    }
  });

  it("dataAsOf sans âge attendu reste valide (rétrocompatibilité v1.2)", () => {
    const rendu = validateSummary(makeValidSummary());
    expect(rendu.dataAsOf).toBeDefined();
    expect(rendu.expectedMaxAgeSec).toBeUndefined();
  });
});

describe("v1.3 — ce qu'un consommateur non re-pinné perd, et en silence", () => {
  it("details disparaît à la lecture d'un consommateur épinglé avant la v1.3", () => {
    // Même démonstration que pour `usage` avant la v1.1 : aucune erreur, juste un bloc
    // absent. C'est pour ça que le HANDOVER dit quels dépôts re-pinner.
    const surLeFil = validateSummary({ ...makeValidSummary(), details: sectionsValides });
    expect(surLeFil.details).toBeDefined();

    const consommateurAncien = HubSummarySchema.omit({ details: true }).strip();
    const vu = consommateurAncien.parse(surLeFil) as Record<string, unknown>;
    expect(vu.details).toBeUndefined();
  });

  it("HubSummarySchema reste un ZodObject : .omit() et .extend() fonctionnent encore", () => {
    // Garde-fou de la décision écrite en tête du schéma : un `.superRefine` à la racine
    // aurait retiré ces méthodes, et ce test est ce qui l'interdit.
    expect(typeof HubSummarySchema.omit).toBe("function");
    expect(typeof HubSummarySchema.extend).toBe("function");
  });
});
