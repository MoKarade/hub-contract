/**
 * Vérification de la session partagée du hub (cookie JWS signé ES256), écrite UNE fois.
 *
 * Contexte : plan `plan-auth-asym-hubperso` (Option A). Hubperso est le SEUL à signer (clé
 * privée dans son seul projet Vercel). Les satellites ne font que LIRE, avec les clés
 * publiques : ce module n'importe aucune fonction de signature et ne reçoit jamais de clé
 * privée. Une satellite qui l'utilise ne peut donc pas fabriquer de session par construction.
 *
 * Volontairement SANS framework et SANS réseau : ni `Request`, ni `next/server`, ni fetch d'un
 * JWKS distant (pas de SSRF ni de dépendance réseau dans un middleware). Les clés publiques
 * arrivent en paramètre (typiquement une variable d'environnement parsée par l'app).
 *
 * `jose` est une dépendance PAIRE (peerDependency) et non une dépendance runtime : le contrat
 * principal reste `zod` seul, et seul ce sous-chemin (`/session`) importe `jose`.
 *
 * Règles de sécurité (chacune a un test) :
 * - algorithme figé à ES256 : jamais `none`, jamais HS256 (confusion avec la clé publique) ;
 * - `kid` obligatoire et retrouvé dans les clés publiées (pas de repli sur « la seule clé ») ;
 * - `exp` et `iat` obligatoires, émetteur vérifié, tolérance d'horloge 30 s, durée de vie
 *   bornée, `iat` dans le futur refusé ;
 * - toute anomalie rend `null`, jamais d'exception (le middleware redirige vers le login).
 */
import { decodeProtectedHeader, importJWK, jwtVerify, type JWK } from "jose";

/** Seul algorithme accepté. */
export const SESSION_ALGORITHME = "ES256";
/** Émetteur attendu (`iss`) : le hub. */
export const SESSION_EMETTEUR = "hubperso.com";
/** Tolérance d'horloge, en secondes (exp, nbf, iat). */
export const SESSION_TOLERANCE_S = 30;
/** Durée de vie maximale acceptée (exp - iat), en secondes : 31 jours (cookie de 30 jours). */
export const SESSION_DUREE_MAX_S = 31 * 86_400;

/** Clés publiques publiées par le hub : un JWKS (1 à 2 `kid` pendant une rotation). */
export interface ClesPubliques {
  keys: JWK[];
}

/** Ce que le hub a signé, et rien d'autre. */
export interface IdentiteSession {
  email: string;
  /** Présent seulement si le hub l'a signé sous forme de texte. */
  sub?: string;
  /** `iat`, en secondes Unix. */
  emisLe: number;
  /** `exp`, en secondes Unix. */
  expireLe: number;
}

export interface OptionsSession {
  /** Horloge injectable (tests). Défaut : maintenant. */
  maintenant?: Date;
  /** Émetteur attendu. Défaut : `SESSION_EMETTEUR`. */
  emetteur?: string;
}

/** Les JWK candidats pour ce `kid` : publics seulement, courbe P-256. */
function candidates(cles: unknown, kid: string): JWK[] {
  const keys = (cles as { keys?: unknown } | null | undefined)?.keys;
  if (!Array.isArray(keys)) return [];
  return keys.filter(
    (k): k is JWK =>
      typeof k === "object" &&
      k !== null &&
      (k as JWK).kid === kid &&
      (k as JWK).kty === "EC" &&
      (k as JWK).crv === "P-256" &&
      !("d" in k),
  );
}

async function verifierAvec(cookie: string, jwk: JWK, options: OptionsSession) {
  const cle = await importJWK(jwk, SESSION_ALGORITHME);
  return jwtVerify(cookie, cle, {
    algorithms: [SESSION_ALGORITHME],
    issuer: options.emetteur ?? SESSION_EMETTEUR,
    clockTolerance: SESSION_TOLERANCE_S,
    currentDate: options.maintenant ?? new Date(),
    requiredClaims: ["exp", "iat"],
  });
}

/**
 * Vérifie le cookie de session et rend l'identité, ou `null` si quoi que ce soit ne va pas.
 * Ne lève jamais.
 */
export async function verifierSession(
  cookieValue: unknown,
  clesPubliques: unknown,
  options: OptionsSession = {},
): Promise<IdentiteSession | null> {
  if (typeof cookieValue !== "string" || cookieValue === "") return null;
  try {
    const entete = decodeProtectedHeader(cookieValue);
    if (entete.alg !== SESSION_ALGORITHME || typeof entete.kid !== "string") return null;
    for (const jwk of candidates(clesPubliques, entete.kid)) {
      try {
        const { payload } = await verifierAvec(cookieValue, jwk, options);
        return identite(payload, (options.maintenant ?? new Date()).getTime() / 1000);
      } catch {
        // signature fausse avec cette clé : on essaie la suivante portant le même kid
      }
    }
  } catch {
    // en-tête illisible
  }
  return null;
}

function identite(
  payload: { email?: unknown; sub?: unknown; iat?: number; exp?: number },
  maintenantS: number,
): IdentiteSession | null {
  const { email, sub, iat, exp } = payload;
  if (typeof email !== "string" || email.trim() === "") return null;
  if (typeof iat !== "number" || typeof exp !== "number") return null;
  if (iat > maintenantS + SESSION_TOLERANCE_S) return null;
  if (exp - iat > SESSION_DUREE_MAX_S) return null;
  return {
    email,
    ...(typeof sub === "string" ? { sub } : {}),
    emisLe: iat,
    expireLe: exp,
  };
}
