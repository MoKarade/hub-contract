// src/session.ts
import { decodeProtectedHeader, importJWK, jwtVerify } from "jose";
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
  const cle = await importJWK(jwk, SESSION_ALGORITHME);
  return jwtVerify(cookie, cle, {
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
    const entete = decodeProtectedHeader(cookieValue);
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
export {
  SESSION_ALGORITHME,
  SESSION_DUREE_MAX_S,
  SESSION_EMETTEUR,
  SESSION_TOLERANCE_S,
  verifierSession
};
//# sourceMappingURL=session.mjs.map