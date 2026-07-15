import { describe, expect, it } from "vitest";
import {
  CONTRACT_VERSION,
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
  it("rejette un contractVersion différent de la version courante", () => {
    const summary = { ...makeValidSummary(), contractVersion: 2 };
    expect(() => validateSummary(summary)).toThrow(/contractVersion/);
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

describe("constantes du contrat", () => {
  it("expose la version courante et le header d'auth", () => {
    expect(CONTRACT_VERSION).toBe(1);
    expect(HUB_TOKEN_HEADER).toBe("x-hub-token");
  });
});
