import { defineConfig } from "vitest/config";

// Ajouté avec les portes qualité de l'Atelier (S6, 23/09/2026) : sans `coverage.include`, la
// couverture compterait aussi dist/ (commité, voir [DIST-VERSIONNE]) et tsup.config.ts.
// Rien d'autre ne change pour les tests : mêmes fichiers, mêmes réglages par défaut.
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      reporter: ["text-summary", "json-summary"],
      reportsDirectory: "coverage",
    },
  },
});
