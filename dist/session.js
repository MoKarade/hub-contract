"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/session.ts
var session_exports = {};
__export(session_exports, {
  SESSION_ALGORITHME: () => SESSION_ALGORITHME,
  SESSION_DUREE_MAX_S: () => SESSION_DUREE_MAX_S,
  SESSION_EMETTEUR: () => SESSION_EMETTEUR,
  SESSION_TOLERANCE_S: () => SESSION_TOLERANCE_S,
  verifierSession: () => verifierSession
});
module.exports = __toCommonJS(session_exports);
var import_jose = require("jose");
var SESSION_ALGORITHME = "ES256";
var SESSION_EMETTEUR = "hubperso.com";
var SESSION_TOLERANCE_S = 30;
var SESSION_DUREE_MAX_S = 31 * 86400;
function candidates(cles, kid) {
  const keys = cles?.keys;
  if (!Array.isArray(keys)) return [];
  return keys.filter(
    (k) => typeof k === "object" && k !== null && k.kid === kid && k.kty === "EC" && k.crv === "P-256" && !("d" in k)
  );
}
async function verifierAvec(cookie, jwk, options) {
  const cle = await (0, import_jose.importJWK)(jwk, SESSION_ALGORITHME);
  return (0, import_jose.jwtVerify)(cookie, cle, {
    algorithms: [SESSION_ALGORITHME],
    issuer: options.emetteur ?? SESSION_EMETTEUR,
    clockTolerance: SESSION_TOLERANCE_S,
    currentDate: options.maintenant ?? /* @__PURE__ */ new Date(),
    requiredClaims: ["exp", "iat"]
  });
}
async function verifierSession(cookieValue, clesPubliques, options = {}) {
  if (typeof cookieValue !== "string" || cookieValue === "") return null;
  try {
    const entete = (0, import_jose.decodeProtectedHeader)(cookieValue);
    if (entete.alg !== SESSION_ALGORITHME || typeof entete.kid !== "string") return null;
    for (const jwk of candidates(clesPubliques, entete.kid)) {
      try {
        const { payload } = await verifierAvec(cookieValue, jwk, options);
        return identite(payload, (options.maintenant ?? /* @__PURE__ */ new Date()).getTime() / 1e3);
      } catch {
      }
    }
  } catch {
  }
  return null;
}
function identite(payload, maintenantS) {
  const { email, sub, iat, exp } = payload;
  if (typeof email !== "string" || email.trim() === "") return null;
  if (typeof iat !== "number" || typeof exp !== "number") return null;
  if (iat > maintenantS + SESSION_TOLERANCE_S) return null;
  if (exp - iat > SESSION_DUREE_MAX_S) return null;
  return {
    email,
    ...typeof sub === "string" ? { sub } : {},
    emisLe: iat,
    expireLe: exp
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SESSION_ALGORITHME,
  SESSION_DUREE_MAX_S,
  SESSION_EMETTEUR,
  SESSION_TOLERANCE_S,
  verifierSession
});
//# sourceMappingURL=session.js.map