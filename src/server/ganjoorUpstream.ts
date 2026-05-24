const OFFLINE_GANJOOR_API_ORIGIN = "http://api.offline.ganjoor.net";
const PRODUCTION_GANJOOR_API_ORIGIN = "https://api.ganjoor.net";

/** Production API by default; offline only for desktop builds. */
export function getDefaultGanjoorApiBaseUrl(): string {
  return process.env.DESKTOP_BUILD === "1"
    ? OFFLINE_GANJOOR_API_ORIGIN
    : PRODUCTION_GANJOOR_API_ORIGIN;
}

/**
 * Upstream origin for `/api/ganjoor/*` and `/api/audio/*` proxy routes.
 * Must match defaults in `next.config.js` and `src/api/GanjoorApi.ts`.
 */
export function getGanjoorUpstreamOrigin(): string {
  const raw =
    process.env.GANJOOR_API_BASE_URL ||
    process.env.NEXT_PUBLIC_GANJOOR_API_BASE_URL ||
    getDefaultGanjoorApiBaseUrl();

  try {
    return new URL(raw).origin;
  } catch {
    const trimmed = raw.replace(/\/+$/, "");
    try {
      return new URL(trimmed).origin;
    } catch {
      return getDefaultGanjoorApiBaseUrl();
    }
  }
}
