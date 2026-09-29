import { exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { verifierSession, SESSION_ALGORITHME, SESSION_EMETTEUR } from "../src/session.js";

// Les clés sont générées À L'EXÉCUTION : aucune clé (ni privée ni publique) n'est commitée.
const MAINTENANT = new Date("2026-09-28T12:00:00Z");
const NOW_S = Math.floor(MAINTENANT.getTime() / 1000);
const JOUR = 86_400;

interface Paire {
  privee: CryptoKey;
  jwk: JWK;
}

async function paire(kid: string): Promise<Paire> {
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  return { privee: privateKey, jwk: { ...(await exportJWK(publicKey)), kid, alg: "ES256", use: "sig" } };
}

interface Options {
  kid?: string | null;
  iss?: string | null;
  iat?: number | null;
  exp?: number | null;
  nbf?: number;
  email?: unknown;
  sub?: unknown;
}

async function cookie(cle: CryptoKey, o: Options = {}): Promise<string> {
  const payload: Record<string, unknown> = {};
  if (o.email !== undefined) payload.email = o.email;
  else payload.email = "marc@example.test";
  if (o.sub !== undefined) payload.sub = o.sub;
  const jwt = new SignJWT(payload);
  const header: { alg: "ES256"; kid?: string } = { alg: "ES256" };
  if (o.kid !== null) header.kid = o.kid ?? "k1";
  jwt.setProtectedHeader(header);
  if (o.iss !== null) jwt.setIssuer(o.iss ?? SESSION_EMETTEUR);
  if (o.iat !== null) jwt.setIssuedAt(o.iat ?? NOW_S - 60);
  if (o.exp !== null) jwt.setExpirationTime(o.exp ?? NOW_S + 30 * JOUR);
  if (o.nbf !== undefined) jwt.setNotBefore(o.nbf);
  return jwt.sign(cle);
}

const enB64url = (octets: Uint8Array): string =>
  btoa(String.fromCharCode(...octets)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deB64url = (t: string): Uint8Array =>
  Uint8Array.from(atob(t.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const b64 = (o: unknown): string => enB64url(new TextEncoder().encode(JSON.stringify(o)));

let k1: Paire;
let k2: Paire;
let intrus: Paire;

beforeAll(async () => {
  k1 = await paire("k1");
  k2 = await paire("k2");
  intrus = await paire("k1"); // même kid que k1, autre clé : la signature doit être refusée
});

const v = (c: string, cles: { keys: JWK[] }): ReturnType<typeof verifierSession> =>
  verifierSession(c, cles, { maintenant: MAINTENANT });

describe("verifierSession : cas valide", () => {
  it("rend l'identité vérifiée, avec ce qui est réellement signé", async () => {
    const c = await cookie(k1.privee, { sub: "u-1" });
    expect(await v(c, { keys: [k1.jwk] })).toEqual({
      email: "marc@example.test",
      sub: "u-1",
      emisLe: NOW_S - 60,
      expireLe: NOW_S + 30 * JOUR,
    });
  });

  it("sub absent : identité rendue sans sub (jamais inventé)", async () => {
    const r = await v(await cookie(k1.privee), { keys: [k1.jwk] });
    expect(r).not.toBeNull();
    expect(r).not.toHaveProperty("sub");
  });

  it("l'algorithme figé est ES256", () => {
    expect(SESSION_ALGORITHME).toBe("ES256");
    expect(SESSION_EMETTEUR).toBe("hubperso.com");
  });
});

describe("verifierSession : rotation (plusieurs kid)", () => {
  it("accepte un cookie signé par l'ancienne OU la nouvelle clé publiée", async () => {
    const cles = { keys: [k1.jwk, k2.jwk] };
    expect(await v(await cookie(k1.privee, { kid: "k1" }), cles)).not.toBeNull();
    expect(await v(await cookie(k2.privee, { kid: "k2" }), cles)).not.toBeNull();
  });

  it("refuse un kid inconnu", async () => {
    expect(await v(await cookie(k2.privee, { kid: "k2" }), { keys: [k1.jwk] })).toBeNull();
  });

  it("refuse un cookie sans kid (kid requis, même avec une seule clé publiée)", async () => {
    expect(await v(await cookie(k1.privee, { kid: null }), { keys: [k1.jwk] })).toBeNull();
  });

  it("refuse un kid connu signé par une AUTRE clé (pas de repli sur une autre clé)", async () => {
    expect(await v(await cookie(intrus.privee, { kid: "k1" }), { keys: [k1.jwk] })).toBeNull();
    expect(await v(await cookie(k1.privee, { kid: "k2" }), { keys: [k1.jwk, k2.jwk] })).toBeNull();
  });
});

describe("verifierSession : attaques sur l'algorithme", () => {
  it("refuse alg:none (jeton non signé), avec ou sans signature vide", async () => {
    const corps = b64({ email: "marc@example.test", iss: SESSION_EMETTEUR, iat: NOW_S, exp: NOW_S + JOUR });
    for (const alg of ["none", "None", "NONE"]) {
      const enTete = b64({ alg, kid: "k1" });
      expect(await v(`${enTete}.${corps}.`, { keys: [k1.jwk] })).toBeNull();
      expect(await v(`${enTete}.${corps}`, { keys: [k1.jwk] })).toBeNull();
    }
  });

  it("refuse HS256 signé avec la clé publique comme secret (confusion d'algorithme)", async () => {
    const secrets = [
      new TextEncoder().encode(JSON.stringify(k1.jwk)),
      new TextEncoder().encode(String(k1.jwk.x) + String(k1.jwk.y)),
      deB64url(String(k1.jwk.x)),
    ];
    for (const secret of secrets) {
      const forge = await new SignJWT({ email: "marc@example.test" })
        .setProtectedHeader({ alg: "HS256", kid: "k1" })
        .setIssuer(SESSION_EMETTEUR)
        .setIssuedAt(NOW_S)
        .setExpirationTime(NOW_S + JOUR)
        .sign(secret);
      expect(await v(forge, { keys: [k1.jwk] })).toBeNull();
    }
  });

  it("refuse tout algorithme autre que ES256, même correctement signé (ES384)", async () => {
    const { privateKey, publicKey } = await generateKeyPair("ES384");
    const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "ES384" };
    const c = await new SignJWT({ email: "marc@example.test" })
      .setProtectedHeader({ alg: "ES384", kid: "k1" })
      .setIssuer(SESSION_EMETTEUR)
      .setIssuedAt(NOW_S - 60)
      .setExpirationTime(NOW_S + JOUR)
      .sign(privateKey);
    expect(await v(c, { keys: [jwk] })).toBeNull();
  });
});

describe("verifierSession : temps", () => {
  it("refuse un cookie expiré", async () => {
    const c = await cookie(k1.privee, { iat: NOW_S - 2 * JOUR, exp: NOW_S - JOUR });
    expect(await v(c, { keys: [k1.jwk] })).toBeNull();
  });

  it("tolère 30 s d'horloge de retard à l'expiration, pas 31 s de plus", async () => {
    expect(await v(await cookie(k1.privee, { exp: NOW_S - 29 }), { keys: [k1.jwk] })).not.toBeNull();
    expect(await v(await cookie(k1.privee, { exp: NOW_S - 31 }), { keys: [k1.jwk] })).toBeNull();
  });

  it("refuse un cookie émis dans le futur (iat), au-delà de 30 s de tolérance", async () => {
    expect(await v(await cookie(k1.privee, { iat: NOW_S + 3600 }), { keys: [k1.jwk] })).toBeNull();
    expect(await v(await cookie(k1.privee, { iat: NOW_S + 29 }), { keys: [k1.jwk] })).not.toBeNull();
    expect(await v(await cookie(k1.privee, { iat: NOW_S + 31 }), { keys: [k1.jwk] })).toBeNull();
  });

  it("refuse un cookie pas encore valide (nbf futur)", async () => {
    expect(await v(await cookie(k1.privee, { nbf: NOW_S + 3600 }), { keys: [k1.jwk] })).toBeNull();
  });

  it("refuse un cookie sans exp (jamais de session éternelle) ou sans iat", async () => {
    expect(await v(await cookie(k1.privee, { exp: null }), { keys: [k1.jwk] })).toBeNull();
    expect(await v(await cookie(k1.privee, { iat: null }), { keys: [k1.jwk] })).toBeNull();
  });

  it("refuse une durée de vie plus longue que le maximum accepté (défaut 31 jours)", async () => {
    const trop = await cookie(k1.privee, { exp: NOW_S + 400 * JOUR });
    expect(await v(trop, { keys: [k1.jwk] })).toBeNull();
    const ok = await cookie(k1.privee, { exp: NOW_S + 30 * JOUR });
    expect(await v(ok, { keys: [k1.jwk] })).not.toBeNull();
  });

  it("sans option `maintenant`, utilise l'horloge réelle", async () => {
    const maintenant = Math.floor(Date.now() / 1000);
    const c = await cookie(k1.privee, { iat: maintenant, exp: maintenant + JOUR });
    expect(await verifierSession(c, { keys: [k1.jwk] })).not.toBeNull();
  });
});

describe("verifierSession : contenu", () => {
  it("refuse un émetteur absent ou différent de hubperso.com", async () => {
    expect(await v(await cookie(k1.privee, { iss: null }), { keys: [k1.jwk] })).toBeNull();
    expect(await v(await cookie(k1.privee, { iss: "evil.example" }), { keys: [k1.jwk] })).toBeNull();
  });

  it("émetteur configurable", async () => {
    const c = await cookie(k1.privee, { iss: "autre.test" });
    expect(await verifierSession(c, { keys: [k1.jwk] }, { maintenant: MAINTENANT, emetteur: "autre.test" })).not.toBeNull();
  });

  it("refuse un email absent, vide ou non textuel", async () => {
    for (const email of [undefined, "", "   ", 42, null, ["a@b.test"]]) {
      const o: Options = email === undefined ? {} : { email };
      const c =
        email === undefined
          ? await new SignJWT({})
              .setProtectedHeader({ alg: "ES256", kid: "k1" })
              .setIssuer(SESSION_EMETTEUR)
              .setIssuedAt(NOW_S - 60)
              .setExpirationTime(NOW_S + JOUR)
              .sign(k1.privee)
          : await cookie(k1.privee, o);
      expect(await v(c, { keys: [k1.jwk] })).toBeNull();
    }
  });

  it("ignore un sub non textuel plutôt que de le recopier", async () => {
    const r = await v(await cookie(k1.privee, { sub: 12 }), { keys: [k1.jwk] });
    expect(r).not.toBeNull();
    expect(r).not.toHaveProperty("sub");
  });
});

describe("verifierSession : entrées invalides (jamais d'exception)", () => {
  it("cookie absent, vide ou non textuel", async () => {
    for (const c of [undefined, null, "", 12, {}]) {
      expect(await v(c as never, { keys: [k1.jwk] })).toBeNull();
    }
  });

  it("cookie mal formé ou trafiqué", async () => {
    const bon = await cookie(k1.privee);
    for (const c of ["abc", "a.b", "a.b.c", "....", `${bon}x`, bon.slice(0, -4), `${bon.split(".")[0]}.${b64({ email: "x@y.test" })}.${bon.split(".")[2]}`]) {
      expect(await v(c, { keys: [k1.jwk] })).toBeNull();
    }
  });

  it("clés publiques absentes, vides ou mal formées", async () => {
    const c = await cookie(k1.privee);
    for (const cles of [undefined, null, {}, { keys: [] }, { keys: "x" }, { keys: [{}] }, { keys: [{ kty: "EC" }] }, "x"]) {
      expect(await v(c, cles as never)).toBeNull();
    }
  });

  it("une clé mal formée n'empêche pas de lire avec les clés valides", async () => {
    const c = await cookie(k2.privee, { kid: "k2" });
    expect(await v(c, { keys: [{ kty: "EC", kid: "k1" }, k2.jwk] })).not.toBeNull();
  });

  it("une clé privée publiée par erreur est ignorée (vérification seule)", async () => {
    const c = await cookie(k1.privee);
    const avecPrivee = { ...k1.jwk, d: "AAAA" };
    expect(await v(c, { keys: [avecPrivee] })).toBeNull();
  });
});
