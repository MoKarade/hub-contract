import { describe, expect, it } from "vitest";
import { CONTRACT_VERSION, type HubSummary } from "../src/index";
import { jetonsEgaux, serveSummary } from "../src/endpoint";

const app: HubSummary["app"] = {
  id: "demo",
  name: "Démo",
  url: "https://demo.hubperso.com",
  color: "#3355ff",
};

function summaryValide(): HubSummary {
  return {
    contractVersion: CONTRACT_VERSION,
    app,
    generatedAt: new Date().toISOString(),
    status: "ok",
    metrics: [{ label: "Docs", value: 3, format: "number" }],
    alerts: [],
    actions: [],
  };
}

const JETON = "jeton-de-test-suffisamment-long";
const build = () => summaryValide();

describe("serveSummary — l'ordre des gardes", () => {
  it("405 sur une méthode autre que GET, avant toute vérification de jeton", async () => {
    const r = await serveSummary({ method: "POST", token: JETON }, { expectedToken: JETON, build });
    expect(r.status).toBe(405);
  });

  it("503 quand l'intégration n'est pas configurée — PAS 401", async () => {
    // Confondre les deux enverrait chercher un problème d'authentification là où il n'y a
    // rien de branché.
    for (const attendu of [undefined, null, ""]) {
      const r = await serveSummary({ method: "GET", token: JETON }, { expectedToken: attendu, build });
      expect(r.status).toBe(503);
    }
  });

  it("503 l'emporte même si l'appelant présente un jeton faux", async () => {
    const r = await serveSummary({ method: "GET", token: "faux" }, { expectedToken: "", build });
    expect(r.status).toBe(503);
  });

  it("401 sur jeton absent ou faux", async () => {
    for (const fourni of [undefined, null, "", "mauvais"]) {
      const r = await serveSummary({ method: "GET", token: fourni }, { expectedToken: JETON, build });
      expect(r.status).toBe(401);
    }
  });

  it("200 + summary validé sur jeton correct", async () => {
    const r = await serveSummary({ method: "GET", token: JETON }, { expectedToken: JETON, build });
    expect(r.status).toBe(200);
    expect(JSON.parse(r.body).app.id).toBe("demo");
  });

  it("accepte la méthode en minuscules", async () => {
    const r = await serveSummary({ method: "get", token: JETON }, { expectedToken: JETON, build });
    expect(r.status).toBe(200);
  });
});

describe("serveSummary — honnêteté", () => {
  it("500 si build() jette : jamais un summary partiel", async () => {
    const r = await serveSummary(
      { method: "GET", token: JETON },
      {
        expectedToken: JETON,
        build: () => {
          throw new Error("Sheet injoignable");
        },
      },
    );
    expect(r.status).toBe(500);
    expect(JSON.parse(r.body).detail).toContain("Sheet injoignable");
  });

  it("une panne ASYNCHRONE est traitée pareil", async () => {
    const r = await serveSummary(
      { method: "GET", token: JETON },
      { expectedToken: JETON, build: async () => Promise.reject(new Error("timeout")) },
    );
    expect(r.status).toBe(500);
  });

  it("un payload hors contrat JETTE au lieu d'être publié", async () => {
    // L'app ne doit jamais émettre un summary invalide : sans ça c'est le hub qui découvre
    // la faute, à distance, et l'affiche sous le nom de l'app.
    await expect(
      serveSummary(
        { method: "GET", token: JETON },
        { expectedToken: JETON, build: () => ({ ...summaryValide(), status: "n'importe quoi" }) as never },
      ),
    ).rejects.toThrow(/status/);
  });

  it("toute réponse porte no-store, y compris les échecs", async () => {
    for (const r of [
      await serveSummary({ method: "POST", token: JETON }, { expectedToken: JETON, build }),
      await serveSummary({ method: "GET", token: "x" }, { expectedToken: JETON, build }),
      await serveSummary({ method: "GET", token: JETON }, { expectedToken: null, build }),
      await serveSummary({ method: "GET", token: JETON }, { expectedToken: JETON, build }),
    ]) {
      expect(r.headers["cache-control"]).toBe("no-store");
    }
  });
});

describe("jetonsEgaux", () => {
  it("vrai sur égalité stricte, faux sinon", async () => {
    expect(await jetonsEgaux(JETON, JETON)).toBe(true);
    expect(await jetonsEgaux(JETON, JETON + "x")).toBe(false);
    expect(await jetonsEgaux("", "")).toBe(true);
    expect(await jetonsEgaux("a", "")).toBe(false);
  });

  it("ne fuit pas la longueur : deux longueurs très différentes comparent quand même", async () => {
    expect(await jetonsEgaux("a", "b".repeat(4096))).toBe(false);
  });

  it("est sensible à la casse et aux espaces", async () => {
    expect(await jetonsEgaux("Jeton", "jeton")).toBe(false);
    expect(await jetonsEgaux("jeton ", "jeton")).toBe(false);
  });
});
