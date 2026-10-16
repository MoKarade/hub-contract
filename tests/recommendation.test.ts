import { describe, expect, it } from "vitest";
import {
  CONTRACT_VERSION,
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

describe("Champ recommendation du contrat", () => {
  it("un summary sans recommendation reste valide (undefined rendu)", () => {
    const summary = buildingSummary(validApp);
    const result = validateSummary(summary);
    expect(result.recommendation).toBeUndefined();
  });

  it("un label seul est accepté et rendu à l'identique", () => {
    const recommendation = { label: "Rembourser la carte" };
    const summary = {
      ...buildingSummary(validApp),
      recommendation,
    };
    const result = validateSummary(summary);
    expect(result.recommendation).toEqual(recommendation);
  });

  it("label, why et href ensemble sont acceptés et rendus à l'identique", () => {
    const recommendation = {
      label: "Verser 2 350 $ au CELI avant le 31 décembre",
      why: "Le cashflow mensuel le permet et le plafond expire à la fin de l'année.",
      href: "https://finance.hubperso.com/objectifs",
    };
    const summary = {
      ...buildingSummary(validApp),
      recommendation,
    };
    const result = validateSummary(summary);
    expect(result.recommendation).toEqual(recommendation);
  });

  it("un label de 80 caractères est accepté et rendu à l'identique", () => {
    const recommendation = { label: "a".repeat(80) };
    const summary = {
      ...buildingSummary(validApp),
      recommendation,
    };
    const result = validateSummary(summary);
    expect(result.recommendation).toEqual(recommendation);
  });

  it("un label de 81 caractères est rejeté", () => {
    const summary = {
      ...buildingSummary(validApp),
      recommendation: { label: "a".repeat(81) },
    };
    expect(() => validateSummary(summary)).toThrow(/recommendation\.label/);
  });

  it("un label vide est rejeté", () => {
    const summary = {
      ...buildingSummary(validApp),
      recommendation: { label: "" },
    };
    expect(() => validateSummary(summary)).toThrow(/recommendation\.label/);
  });

  it("un why de 140 caractères est accepté et rendu à l'identique", () => {
    const recommendation = {
      label: "Rembourser la carte",
      why: "b".repeat(140),
    };
    const summary = {
      ...buildingSummary(validApp),
      recommendation,
    };
    const result = validateSummary(summary);
    expect(result.recommendation).toEqual(recommendation);
  });

  it("un why de 141 caractères est rejeté", () => {
    const summary = {
      ...buildingSummary(validApp),
      recommendation: {
        label: "Rembourser la carte",
        why: "b".repeat(141),
      },
    };
    expect(() => validateSummary(summary)).toThrow(/recommendation\.why/);
  });

  it("un why vide est rejeté", () => {
    const summary = {
      ...buildingSummary(validApp),
      recommendation: {
        label: "Rembourser la carte",
        why: "",
      },
    };
    expect(() => validateSummary(summary)).toThrow(/recommendation\.why/);
  });

  it("un href relatif comme /relatif est rejeté", () => {
    const summary = {
      ...buildingSummary(validApp),
      recommendation: {
        label: "Rembourser la carte",
        href: "/relatif",
      },
    };
    expect(() => validateSummary(summary)).toThrow(/recommendation\.href/);
  });
});
