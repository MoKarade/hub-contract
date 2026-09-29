import { JWK } from 'jose';

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

/** Seul algorithme accepté. */
declare const SESSION_ALGORITHME = "ES256";
/** Émetteur attendu (`iss`) : le hub. */
declare const SESSION_EMETTEUR = "hubperso.com";
/** Tolérance d'horloge, en secondes (exp, nbf, iat). */
declare const SESSION_TOLERANCE_S = 30;
/** Durée de vie maximale acceptée (exp - iat), en secondes : 31 jours (cookie de 30 jours). */
declare const SESSION_DUREE_MAX_S: number;
/** Clés publiques publiées par le hub : un JWKS (1 à 2 `kid` pendant une rotation). */
interface ClesPubliques {
    keys: JWK[];
}
/** Ce que le hub a signé, et rien d'autre. */
interface IdentiteSession {
    email: string;
    /** Présent seulement si le hub l'a signé sous forme de texte. */
    sub?: string;
    /** `iat`, en secondes Unix. */
    emisLe: number;
    /** `exp`, en secondes Unix. */
    expireLe: number;
}
interface OptionsSession {
    /** Horloge injectable (tests). Défaut : maintenant. */
    maintenant?: Date;
    /** Émetteur attendu. Défaut : `SESSION_EMETTEUR`. */
    emetteur?: string;
}
/**
 * Vérifie le cookie de session et rend l'identité, ou `null` si quoi que ce soit ne va pas.
 * Ne lève jamais.
 */
declare function verifierSession(cookieValue: unknown, clesPubliques: unknown, options?: OptionsSession): Promise<IdentiteSession | null>;

export { type ClesPubliques, type IdentiteSession, type OptionsSession, SESSION_ALGORITHME, SESSION_DUREE_MAX_S, SESSION_EMETTEUR, SESSION_TOLERANCE_S, verifierSession };
