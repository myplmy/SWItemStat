export interface AppConfig {
  githubPagesOrigin: string;
  steamApiKey: string;
  steamId: string;
  steamVanity: string;
}

const STEAM_ID_PATTERN = /^7656\d{13}$/;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const steamApiKey = environment.STEAM_WEB_API_KEY?.trim();
  if (!steamApiKey) {
    throw new Error("STEAM_WEB_API_KEY is not configured.");
  }

  const steamId = environment.STEAM_ID?.trim() || "76561197991373987";
  if (!STEAM_ID_PATTERN.test(steamId)) {
    throw new Error("STEAM_ID must be a SteamID64 string.");
  }

  return {
    githubPagesOrigin: (environment.GITHUB_PAGES_ORIGIN || "https://myplmy.github.io").replace(/\/$/, ""),
    steamApiKey,
    steamId,
    steamVanity: environment.STEAM_VANITY?.trim() || "myplmy",
  };
}
