import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// `jose` est une peerDependency OPTIONNELLE, réservée au sous-chemin `/session`. Condition
// d'architecture : le contrat de base (`.`) et `/endpoint` doivent se charger SANS ERREUR quand
// `jose` est absent de node_modules (cinq apps n'utilisent pas `/session`). On le prouve sur le
// dist/ réellement livré, dans un processus Node séparé où toute résolution de `jose` échoue
// (module absent simulé), en CJS et en ESM. Le même dispositif doit faire échouer `/session` :
// sinon le blocage ne prouverait rien.

const dist = (f: string): string => resolve(process.cwd(), "dist", f);

const BLOCAGE_CJS = `
const Module = require("node:module");
const orig = Module._resolveFilename;
Module._resolveFilename = function (request, ...reste) {
  if (request === "jose" || request.startsWith("jose/")) {
    const e = new Error("Cannot find module '" + request + "'"); e.code = "MODULE_NOT_FOUND"; throw e;
  }
  return orig.call(this, request, ...reste);
};`;

const HOOK_ESM = `
export async function resolve(specifier, context, suivant) {
  if (specifier === "jose" || specifier.startsWith("jose/")) {
    const e = new Error("Cannot find package '" + specifier + "'"); e.code = "ERR_MODULE_NOT_FOUND"; throw e;
  }
  return suivant(specifier, context);
}`;
const ENREGISTREMENT_ESM = `import { register } from "node:module";
register("data:text/javascript;base64,${Buffer.from(HOOK_ESM).toString("base64")}");`;

function cjs(fichier: string): string {
  return execFileSync(
    process.execPath,
    ["-e", `${BLOCAGE_CJS}\nconst m = require(${JSON.stringify(dist(fichier))}); process.stdout.write(String(Object.keys(m).length));`],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
}

function esm(fichier: string): string {
  const url = `file:///${dist(fichier).replace(/\\/g, "/")}`;
  return execFileSync(
    process.execPath,
    [
      "--import",
      `data:text/javascript;base64,${Buffer.from(ENREGISTREMENT_ESM).toString("base64")}`,
      "--input-type=module",
      "-e",
      `const m = await import(${JSON.stringify(url)}); process.stdout.write(String(Object.keys(m).length));`,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
}

describe("jose absent : le contrat de base et /endpoint fonctionnent quand même", () => {
  it("CJS : index.js et endpoint.js se chargent et exportent", () => {
    expect(Number(cjs("index.js"))).toBeGreaterThan(0);
    expect(Number(cjs("endpoint.js"))).toBeGreaterThan(0);
  });

  it("ESM : index.mjs et endpoint.mjs se chargent et exportent", () => {
    expect(Number(esm("index.mjs"))).toBeGreaterThan(0);
    expect(Number(esm("endpoint.mjs"))).toBeGreaterThan(0);
  });

  it("le dispositif est réel : /session, lui, échoue sans jose (CJS et ESM)", () => {
    expect(() => cjs("session.js")).toThrow(/jose/);
    expect(() => esm("session.mjs")).toThrow(/jose/);
  });

  it("garde statique : ni index ni endpoint (source et dist) ne mentionnent jose", () => {
    for (const f of ["src/index.ts", "src/endpoint.ts", "dist/index.js", "dist/index.mjs", "dist/endpoint.js", "dist/endpoint.mjs"]) {
      expect(readFileSync(resolve(process.cwd(), f), "utf8"), f).not.toMatch(/jose/);
    }
  });
});
