import { HubSummary } from './index.mjs';
export { HUB_TOKEN_HEADER } from './index.mjs';
import 'zod';

/**
 * Le endpoint `GET .../hub/summary`, écrit UNE fois.
 *
 * Chaque app le réimplémentait à la main : comparaison du jeton en temps constant, le trio
 * 503/401/405, `Cache-Control: no-store`, la validation avant émission. Cinq copies, donc cinq
 * endroits où un correctif doit être appliqué — et `app-template` n'aide pas, puisqu'on le
 * FORKE : un correctif dans le squelette n'atteint jamais les apps déjà forkées. C'est le même
 * défaut que « la même règle dans quatre fichiers, trois états de vérité », mais dans le code,
 * où il coûte plus cher.
 *
 * Volontairement SANS framework : ni `Request`, ni `Response`, ni `next/server`. Une app Next
 * (route handler), une fonction serverless Vercel et un test unitaire appellent la même
 * fonction et traduisent eux-mêmes vers leur propre transport. Aucune dépendance au-delà de
 * `zod`, déjà tirée par le contrat.
 *
 * ⚠️ Ce module n'est PAS utilisable depuis un `api/` déclaré « zéro dépendance npm » (le broker
 * DriveAI). Ce n'est pas un oubli : cette contrainte-là est un choix de ce dépôt-là.
 */

/** Ce que le transport a extrait de la requête entrante. */
interface SummaryRequest {
    /** Méthode HTTP, telle quelle (la comparaison est insensible à la casse). */
    method: string;
    /** Valeur du header `x-hub-token`, ou null/undefined si absent. */
    token?: string | null | undefined;
}
/** Ce que le transport doit renvoyer, tel quel. */
interface SummaryResponse {
    status: number;
    headers: Record<string, string>;
    /** Corps JSON déjà sérialisé. */
    body: string;
}
interface ServeSummaryOptions {
    /**
     * Le jeton attendu, lu dans l'environnement. Absent/vide ⇒ **503**, pas 401 : une intégration
     * non configurée et un appelant non autorisé sont deux situations différentes, et les confondre
     * enverrait chercher un problème d'authentification là où il n'y a rien de branché.
     */
    expectedToken: string | null | undefined;
    /**
     * Construit le summary. Peut être asynchrone. **Si elle jette, on répond 500** — jamais un
     * summary partiel : une panne doit rester observable, et le hub sait afficher « injoignable ».
     */
    build: () => HubSummary | Promise<HubSummary>;
}
/**
 * Compare deux jetons en **temps constant**, via un digest SHA-256 puis un XOR sur toute la
 * longueur.
 *
 * Le digest d'abord, parce qu'il égalise les longueurs : comparer les chaînes brutes ferait
 * fuir la longueur du secret par le temps de réponse, et un `===` sort au premier octet qui
 * diffère. `crypto.subtle` est disponible partout où ces apps tournent (Node ≥ 18, runtime
 * Edge), contrairement à `timingSafeEqual` qui est propre à Node.
 */
declare function jetonsEgaux(a: string, b: string): Promise<boolean>;
/**
 * Applique le contrat de bout en bout et rend la réponse à renvoyer telle quelle.
 *
 * L'ordre des gardes n'est pas indifférent : méthode, puis configuration, puis autorisation.
 * Vérifier le jeton avant la configuration ferait répondre 401 à un appelant parfaitement
 * légitime quand c'est l'app qui n'a rien de branché.
 */
declare function serveSummary(req: SummaryRequest, opts: ServeSummaryOptions): Promise<SummaryResponse>;

export { type ServeSummaryOptions, type SummaryRequest, type SummaryResponse, jetonsEgaux, serveSummary };
