/**
 * Upstream origin for `/api/ganjoor/*` and `/api/audio/*` proxy routes.
 * Must match defaults in `next.config.js` and `src/api/GanjoorApi.ts`.
 */
export function getGanjoorUpstreamOrigin(): string {
  const raw =
    process.env.GANJOOR_API_BASE_URL ||
    process.env.NEXT_PUBLIC_GANJOOR_API_BASE_URL ||
    "https://api.ganjoor.net";

  return originFrom(raw, "https://api.ganjoor.net");
}

/**
 * Semantic search currently lives on ganjgah.ir (api.ganjoor.net returns 503).
 * Browser clients must go through `/api/ganjoor/search/semantic` because the
 * upstream does not allow CORS from this origin.
 */
export function getSemanticSearchUpstreamOrigin(): string {
  const raw =
    process.env.GANJOOR_SEMANTIC_API_BASE_URL || "https://ganjgah.ir";
  return originFrom(raw, "https://ganjgah.ir");
}

function originFrom(raw: string, fallback: string): string {
  try {
    return new URL(raw).origin;
  } catch {
    const trimmed = raw.replace(/\/+$/, "");
    try {
      return new URL(trimmed).origin;
    } catch {
      return fallback;
    }
  }
}
