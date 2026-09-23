import {
  HUB_TOKEN_HEADER,
  validateSummary
} from "./chunk-EFKLDUQ6.mjs";

// src/endpoint.ts
var ENTETES_BASE = {
  "content-type": "application/json; charset=utf-8",
  // Le payload porte des données personnelles et change à chaque tick : il ne se met en cache
  // NULLE PART entre l'app et le hub. Le cache utile est côté producteur (cf. DriveAI), pas ici.
  "cache-control": "no-store"
};
function reponse(status, charge) {
  return { status, headers: { ...ENTETES_BASE }, body: JSON.stringify(charge) };
}
async function jetonsEgaux(a, b) {
  const encodeur = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", encodeur.encode(a)),
    crypto.subtle.digest("SHA-256", encodeur.encode(b))
  ]);
  const va = new Uint8Array(da);
  const vb = new Uint8Array(db);
  let diff = va.length ^ vb.length;
  for (let i = 0; i < va.length; i += 1) {
    diff |= (va[i] ?? 0) ^ (vb[i] ?? 0);
  }
  return diff === 0;
}
async function serveSummary(req, opts) {
  if (req.method.toUpperCase() !== "GET") {
    return reponse(405, { error: "method not allowed" });
  }
  const attendu = opts.expectedToken;
  if (!attendu) {
    return reponse(503, { error: "hub disabled" });
  }
  const fourni = req.token;
  if (!fourni || !await jetonsEgaux(fourni, attendu)) {
    return reponse(401, { error: "unauthorized" });
  }
  let summary;
  try {
    summary = await opts.build();
  } catch (e) {
    return reponse(500, {
      error: "summary unavailable",
      detail: e instanceof Error ? e.message : String(e)
    });
  }
  return reponse(200, validateSummary(summary));
}
export {
  HUB_TOKEN_HEADER,
  jetonsEgaux,
  serveSummary
};
//# sourceMappingURL=endpoint.mjs.map