import { loadConfig } from "../src/server/config.js";
import { applyCors, isOriginAllowed } from "../src/server/cors.js";
import { checkRateLimit } from "../src/server/rate-limit.js";
import { SteamClient } from "../src/server/steam-client.js";
import type { ApiRequest, ApiResponse } from "../src/server/vercel-types.js";
import { WorkshopService } from "../src/server/workshop-service.js";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const config = loadConfig();
  const origin = typeof request.headers.origin === "string" ? request.headers.origin : undefined;

  if (!isOriginAllowed(origin, config.githubPagesOrigin)) {
    return response.status(403).json({ error: "Origin is not allowed." });
  }
  applyCors(response, origin);

  if (request.method === "OPTIONS") {
    return response.status(204).end();
  }
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET, OPTIONS");
    return response.status(405).json({ error: "Method not allowed." });
  }
  if (Object.keys(request.query).length > 0) {
    return response.status(400).json({ error: "This version only supports the configured profile." });
  }

  const forwardedFor = request.headers["x-forwarded-for"];
  const clientId = Array.isArray(forwardedFor)
    ? forwardedFor[0] ?? request.socket.remoteAddress ?? "unknown"
    : forwardedFor?.split(",")[0]?.trim() ?? request.socket.remoteAddress ?? "unknown";
  const limit = checkRateLimit(clientId);
  response.setHeader("X-RateLimit-Limit", String(limit.limit));
  response.setHeader("X-RateLimit-Remaining", String(limit.remaining));
  if (!limit.allowed) {
    response.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return response.status(429).json({ error: "Too many requests." });
  }

  response.setHeader("Cache-Control", "public, max-age=60, s-maxage=900, stale-while-revalidate=3600");
  response.setHeader(
    "Vercel-CDN-Cache-Control",
    "public, s-maxage=900, stale-while-revalidate=3600",
  );

  try {
    const client = new SteamClient(config.steamApiKey);
    const service = new WorkshopService(client, {
      steamId: config.steamId,
      vanity: config.steamVanity,
    });
    const dashboard = await service.getDashboard();
    return response.status(200).json(dashboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    console.error("Workshop dashboard request failed", { message: redact(message, config.steamApiKey) });
    return response.status(502).json({
      error: "Steam data is temporarily unavailable.",
    });
  }
}

function redact(value: string, secret: string): string {
  return secret ? value.replaceAll(secret, "[REDACTED]") : value;
}
