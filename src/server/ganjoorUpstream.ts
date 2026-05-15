/**
 * Upstream origin for `/api/ganjoor/*` and `/api/audio/*` proxy routes.
 * Must match defaults in `next.config.js` and `src/api/GanjoorApi.ts`.
 */
export function getGanjoorUpstreamOrigin(): string {
  const raw =
    process.env.GANJOOR_API_BASE_URL ||
    process.env.NEXT_PUBLIC_GANJOOR_API_BASE_URL ||
    "http://api.offline.ganjoor.net";

  try {
    return new URL(raw).origin;
  } catch {
    const trimmed = raw.replace(/\/+$/, "");
    try {
      return new URL(trimmed).origin;
    } catch {
      return "http://api.offline.ganjoor.net";
    }
  }
}
