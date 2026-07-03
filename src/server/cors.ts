import type { ApiResponse } from "./vercel-types.js";

export function isOriginAllowed(origin: string | undefined, productionOrigin: string): boolean {
  if (!origin) return true;
  if (origin === productionOrigin) return true;

  try {
    const url = new URL(origin);
    return (
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      (url.protocol === "http:" || url.protocol === "https:")
    );
  } catch {
    return false;
  }
}

export function applyCors(response: ApiResponse, origin: string | undefined): void {
  if (origin) response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Vary", "Origin");
}
