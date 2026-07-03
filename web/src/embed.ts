import type { DashboardData, WorkshopItem } from "./types";

export type EmbedDensity = "compact" | "standard" | "full";
export type EmbedTheme = "light" | "dark";

export type EmbedConfig =
  | {
      kind: "game";
      appId: string | null;
      density: EmbedDensity;
      theme: EmbedTheme;
    }
  | {
      kind: "item";
      publishedFileId: string | null;
      density: EmbedDensity;
      theme: EmbedTheme;
    };

export interface GameWidgetData {
  appId: string;
  appName: string;
  itemCount: number;
  totals: DashboardData["totals"];
}

const DENSITIES = new Set<EmbedDensity>(["compact", "standard", "full"]);
const THEMES = new Set<EmbedTheme>(["light", "dark"]);
const NUMERIC_ID = /^\d+$/;

export function parseEmbedConfig(search: string): EmbedConfig | null {
  const params = new URLSearchParams(search);
  const kind = params.get("embed");
  if (kind !== "game" && kind !== "item") return null;

  const densityValue = params.get("density") as EmbedDensity | null;
  const themeValue = params.get("theme") as EmbedTheme | null;
  const density = densityValue && DENSITIES.has(densityValue) ? densityValue : "standard";
  const theme = themeValue && THEMES.has(themeValue) ? themeValue : "light";

  if (kind === "game") {
    const appId = params.get("app")?.trim() || null;
    return {
      kind,
      appId: appId && NUMERIC_ID.test(appId) ? appId : null,
      density,
      theme,
    };
  }

  const publishedFileId = params.get("id")?.trim() || null;
  return {
    kind,
    publishedFileId: publishedFileId && NUMERIC_ID.test(publishedFileId) ? publishedFileId : null,
    density,
    theme,
  };
}

export function findWidgetItem(data: DashboardData, publishedFileId: string): WorkshopItem | null {
  return data.items.find((item) => item.publishedFileId === publishedFileId) || null;
}

export function buildGameWidget(data: DashboardData, appId: string): GameWidgetData | null {
  const items = data.items.filter((item) => item.appId === appId);
  if (items.length === 0) return null;

  const game = data.games.find((entry) => entry.appId === appId);
  return {
    appId,
    appName: game?.name || items[0].appName,
    itemCount: items.length,
    totals: {
      currentFavorites: sum(items, "currentFavorites"),
      currentSubscriptions: sum(items, "currentSubscriptions"),
      lifetimeFavorites: sum(items, "lifetimeFavorites"),
      lifetimeSubscriptions: sum(items, "lifetimeSubscriptions"),
      ratings: sum(items, "ratingCount"),
      views: sum(items, "views"),
    },
  };
}

function sum(items: WorkshopItem[], key: keyof WorkshopItem): number {
  return items.reduce((total, item) => {
    const value = item[key];
    return total + (typeof value === "number" && Number.isFinite(value) ? value : 0);
  }, 0);
}
