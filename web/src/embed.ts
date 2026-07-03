import type { DashboardData, WorkshopItem } from "./types";

export type EmbedCanvas = "solid" | "transparent" | "notion";
export type EmbedDensity = "compact" | "standard" | "full" | "notion";
export type EmbedTheme = "light" | "dark";

export type EmbedConfig =
  | {
      kind: "game";
      appId: string | null;
      canvas: EmbedCanvas;
      density: EmbedDensity;
      showList: boolean;
      theme: EmbedTheme;
    }
  | {
      kind: "item";
      publishedFileId: string | null;
      canvas: EmbedCanvas;
      density: EmbedDensity;
      theme: EmbedTheme;
    };

export interface GameWidgetData {
  appId: string;
  appName: string;
  itemCount: number;
  items: WorkshopItem[];
  positiveRatings: number | null;
  totals: DashboardData["totals"];
}

const DENSITIES = new Set<EmbedDensity>(["compact", "standard", "full", "notion"]);
const CANVASES = new Set<EmbedCanvas>(["solid", "transparent", "notion"]);
const THEMES = new Set<EmbedTheme>(["light", "dark"]);
const NUMERIC_ID = /^\d+$/;

export function parseEmbedConfig(search: string): EmbedConfig | null {
  const params = new URLSearchParams(search);
  const kind = params.get("embed");
  if (kind !== "game" && kind !== "item") return null;

  const densityValue = params.get("density") as EmbedDensity | null;
  const canvasValue = params.get("canvas") as EmbedCanvas | null;
  const themeValue = params.get("theme") as EmbedTheme | null;
  const canvas = canvasValue && CANVASES.has(canvasValue) ? canvasValue : "solid";
  const density = densityValue && DENSITIES.has(densityValue) ? densityValue : "standard";
  const theme = themeValue && THEMES.has(themeValue) ? themeValue : "light";

  if (kind === "game") {
    const appId = params.get("app")?.trim() || null;
    return {
      kind,
      appId: appId && NUMERIC_ID.test(appId) ? appId : null,
      canvas,
      density,
      showList: params.get("list") === "on",
      theme,
    };
  }

  const publishedFileId = params.get("id")?.trim() || null;
  return {
    kind,
    publishedFileId: publishedFileId && NUMERIC_ID.test(publishedFileId) ? publishedFileId : null,
    canvas,
    density,
    theme,
  };
}

export function resolveNotionTheme(fallback: EmbedTheme, prefersDark: boolean | null): EmbedTheme {
  if (prefersDark === null) return fallback;
  return prefersDark ? "dark" : "light";
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
    items,
    positiveRatings: sumOptional(items, "votesUp"),
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

function sumOptional(items: WorkshopItem[], key: keyof WorkshopItem): number | null {
  const values = items
    .map((item) => item[key])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return values.length > 0 ? values.reduce((total, value) => total + value, 0) : null;
}

function sum(items: WorkshopItem[], key: keyof WorkshopItem): number {
  return items.reduce((total, item) => {
    const value = item[key];
    return total + (typeof value === "number" && Number.isFinite(value) ? value : 0);
  }, 0);
}
