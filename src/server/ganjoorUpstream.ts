const OFFLINE_GANJOOR_API_ORIGIN = "http://api.offline.ganjoor.net";
const PRODUCTION_GANJOOR_API_ORIGIN = "https://api.ganjoor.net";

/** Default upstream when env vars are unset (offline for desktop; production on Vercel). */
export function getDefaultGanjoorApiBaseUrl(): string {
  return process.env.VERCEL
    ? PRODUCTION_GANJOOR_API_ORIGIN
    : OFFLINE_GANJOOR_API_ORIGIN;
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
