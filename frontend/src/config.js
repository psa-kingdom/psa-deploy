/**
 * Centralized API & Backend URL configuration.
 *
 * In local development (localhost / 127.0.0.1):
 *   Uses REACT_APP_BACKEND_URL if specified, otherwise defaults to http://localhost:8001.
 *
 * In deployed environments (Vercel Preview, Production, custom domain):
 *   Forces the API base URL to "" (empty string / same-origin) so all requests
 *   are dispatched to same-origin (/api/...) and proxied by Vercel's vercel.json rewrites.
 */

export function getBackendUrl() {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocalhost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname === "0.0.0.0";

    if (isLocalhost) {
      return process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
    }

    // Remote / Deployed (Vercel Preview, Production) -> force same-origin
    return "";
  }

  return "";
}

export const BACKEND_URL = getBackendUrl();
export const API_URL = `${BACKEND_URL}/api`;
