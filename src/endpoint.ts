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
import { HUB_TOKEN_HEADER, validateSummary, type HubSummary } from "./index.js";

/** Ce que le transport a extrait de la requête entrante. */
export interface SummaryRequest {
  /** Méthode HTTP, telle quelle (la comparaison est insensible à la casse). */
  method: string;
  /** Valeur du header `x-hub-token`, ou null/undefined si absent. */
  token?: string | null | undefined;
}

/** Ce que le transport doit renvoyer, tel quel. */
export interface SummaryResponse {
  status: number;
  headers: Record<string, string>;
  /** Corps JSON déjà sérialisé. */
  body: string;
}

export interface ServeSummaryOptions {
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

const ENTETES_BASE: Record<string, string> = {
  "content-type": "application/json; charset=utf-8",
  // Le payload porte des données personnelles et change à chaque tick : il ne se met en cache
  // NULLE PART entre l'app et le hub. Le cache utile est côté producteur (cf. DriveAI), pas ici.
  "cache-control": "no-store",
};

function reponse(status: number, charge: unknown): SummaryResponse {
  return { status, headers: { ...ENTETES_BASE }, body: JSON.stringify(charge) };
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
export async function jetonsEgaux(a: string, b: string): Promise<boolean> {
  const encodeur = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", encodeur.encode(a)),
    crypto.subtle.digest("SHA-256", encodeur.encode(b)),
  ]);
  const va = new Uint8Array(da);
  const vb = new Uint8Array(db);
  let diff = va.length ^ vb.length;
  for (let i = 0; i < va.length; i += 1) {
    diff |= (va[i] ?? 0) ^ (vb[i] ?? 0);
  }
  return diff === 0;
}

/**
 * Applique le contrat de bout en bout et rend la réponse à renvoyer telle quelle.
 *
 * L'ordre des gardes n'est pas indifférent : méthode, puis configuration, puis autorisation.
 * Vérifier le jeton avant la configuration ferait répondre 401 à un appelant parfaitement
 * légitime quand c'est l'app qui n'a rien de branché.
 */
export async function serveSummary(
  req: SummaryRequest,
  opts: ServeSummaryOptions,
): Promise<SummaryResponse> {
  if (req.method.toUpperCase() !== "GET") {
    return reponse(405, { error: "method not allowed" });
  }

  const attendu = opts.expectedToken;
  if (!attendu) {
    return reponse(503, { error: "hub disabled" });
  }

  const fourni = req.token;
  if (!fourni || !(await jetonsEgaux(fourni, attendu))) {
    return reponse(401, { error: "unauthorized" });
  }

  let summary: HubSummary;
  try {
    summary = await opts.build();
  } catch (e) {
    return reponse(500, {
      error: "summary unavailable",
      detail: e instanceof Error ? e.message : String(e),
    });
  }

  // Validé AVANT d'être émis : une app ne publie jamais un payload hors contrat. Sans ça,
  // c'est le hub qui découvre la faute, à distance, et l'affiche sous le nom de l'app.
  return reponse(200, validateSummary(summary));
}

export { HUB_TOKEN_HEADER };
