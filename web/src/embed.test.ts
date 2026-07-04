import { describe, expect, it } from "vitest";
import {
  buildGameWidget,
  DEFAULT_WIDGET_LIST_SORT,
  findWidgetItem,
  getNextWidgetListSort,
  parseEmbedConfig,
  resolveNotionTheme,
  sortWidgetItems,
} from "./embed";
import type { DashboardData, WorkshopItem } from "./types";

const item: WorkshopItem = {
  appId: "529340",
  appName: "Victoria 3",
  createdAt: null,
  currentFavorites: 2,
  currentSubscriptions: 5,
  lifetimeFavorites: 3,
  lifetimeSubscriptions: 8,
  previewUrl: null,
  publishedFileId: "100",
  ratingCount: 10,
  ratingScore: 0.9,
  title: "Example mod",
  updatedAt: null,
  views: 20,
  votesDown: 1,
  votesUp: 9,
  workshopUrl: "https://example.test/100",
};

const data: DashboardData = {
  games: [{ appId: "529340", name: "Victoria 3", itemCount: 2 }],
  items: [item, { ...item, publishedFileId: "200", currentSubscriptions: null, views: 30 }],
  meta: { fetchedAt: "2026-01-01T00:00:00.000Z", itemCount: 2, source: "get-user-files", warnings: [] },
  profile: { steamId: "76561197991373987", vanity: "myplmy", workshopUrl: "https://example.test" },
  totals: {
    currentFavorites: 4,
    currentSubscriptions: 5,
    lifetimeFavorites: 6,
    lifetimeSubscriptions: 16,
    ratings: 20,
    views: 50,
  },
};

function makeItem(publishedFileId: string, title: string, overrides: Partial<WorkshopItem> = {}): WorkshopItem {
  return { ...item, ...overrides, publishedFileId, title };
}

describe("embed configuration", () => {
  it("returns null for the normal dashboard and parses a game widget", () => {
    expect(parseEmbedConfig("?query=test")).toBeNull();
    expect(parseEmbedConfig("?embed=game&app=529340")).toMatchObject({ showList: false });
    expect(parseEmbedConfig("?embed=game&app=529340&density=compact&theme=dark&list=on")).toEqual({
      kind: "game",
      appId: "529340",
      canvas: "solid",
      density: "compact",
      showList: true,
      theme: "dark",
    });
  });

  it("defaults invalid options and rejects a malformed item id", () => {
    expect(parseEmbedConfig("?embed=item&id=not-a-number&density=wide&theme=blue&canvas=glass")).toEqual({
      kind: "item",
      publishedFileId: null,
      canvas: "solid",
      density: "standard",
      theme: "light",
    });
    expect(parseEmbedConfig("?embed=item&id=100&density=notion&canvas=transparent")).toMatchObject({
      canvas: "transparent",
      density: "notion",
    });
    expect(parseEmbedConfig("?embed=item&id=100&density=notion&theme=dark&canvas=notion")).toMatchObject({
      canvas: "notion",
      density: "notion",
      theme: "dark",
    });
  });

  it("uses the detected Notion scheme and falls back to the requested theme", () => {
    expect(resolveNotionTheme("light", true)).toBe("dark");
    expect(resolveNotionTheme("dark", false)).toBe("light");
    expect(resolveNotionTheme("dark", null)).toBe("dark");
  });
});

describe("embed data selection", () => {
  it("aggregates the selected game and treats missing numeric values as zero", () => {
    expect(buildGameWidget(data, "529340")).toMatchObject({
      appName: "Victoria 3",
      itemCount: 2,
      items: data.items,
      positiveRatings: 18,
      totals: { currentSubscriptions: 5, ratings: 20, views: 50 },
    });
    expect(buildGameWidget(data, "294100")).toBeNull();
  });

  it("selects an item and returns null for an unknown id", () => {
    expect(findWidgetItem(data, "100")?.title).toBe("Example mod");
    expect(findWidgetItem(data, "999")).toBeNull();
  });
});

describe("widget list sorting", () => {
  it("defaults to visitors descending and chooses the expected direction for header clicks", () => {
    const items = [
      makeItem("101", "Low", { views: 10 }),
      makeItem("102", "High", { views: 30 }),
      makeItem("103", "Middle", { views: 20 }),
    ];

    expect(DEFAULT_WIDGET_LIST_SORT).toEqual({ direction: "desc", key: "views" });
    expect(sortWidgetItems(items, DEFAULT_WIDGET_LIST_SORT).map((entry) => entry.publishedFileId))
      .toEqual(["102", "103", "101"]);
    expect(sortWidgetItems(items, { direction: "asc", key: "title" }).map((entry) => entry.publishedFileId))
      .toEqual(["102", "101", "103"]);
    expect(getNextWidgetListSort(DEFAULT_WIDGET_LIST_SORT, "views"))
      .toEqual({ direction: "asc", key: "views" });
    expect(getNextWidgetListSort(DEFAULT_WIDGET_LIST_SORT, "title"))
      .toEqual({ direction: "asc", key: "title" });
    expect(getNextWidgetListSort(DEFAULT_WIDGET_LIST_SORT, "ratingCount"))
      .toEqual({ direction: "desc", key: "ratingCount" });
  });

  it("sorts compound columns by current values, total ratings, and subscription rate", () => {
    const items = [
      makeItem("101", "Alpha", {
        currentFavorites: 8,
        currentSubscriptions: 10,
        lifetimeFavorites: 100,
        lifetimeSubscriptions: 100,
        ratingCount: 2,
        views: 100,
      }),
      makeItem("102", "Beta", {
        currentFavorites: 12,
        currentSubscriptions: 20,
        lifetimeFavorites: 30,
        lifetimeSubscriptions: 30,
        ratingCount: 5,
        views: 400,
      }),
      makeItem("103", "Missing", {
        currentFavorites: null,
        currentSubscriptions: null,
        ratingCount: null,
        views: 10,
      }),
    ];
    const ids = (key: "currentFavorites" | "currentSubscriptions" | "ratingCount" | "subscriptionRate") =>
      sortWidgetItems(items, { direction: "desc", key }).map((entry) => entry.publishedFileId);

    expect(ids("currentSubscriptions")).toEqual(["102", "101", "103"]);
    expect(sortWidgetItems(items, { direction: "asc", key: "currentSubscriptions" })
      .map((entry) => entry.publishedFileId)).toEqual(["101", "102", "103"]);
    expect(ids("currentFavorites")).toEqual(["102", "101", "103"]);
    expect(ids("ratingCount")).toEqual(["102", "101", "103"]);
    expect(ids("subscriptionRate")).toEqual(["101", "102", "103"]);
  });

  it("keeps missing values last, breaks ties by title, and does not mutate the source array", () => {
    const items = [
      makeItem("101", "나 모드", { views: null }),
      makeItem("102", "다 모드", { views: 20 }),
      makeItem("103", "가 모드", { views: 20 }),
    ];
    const originalOrder = items.map((entry) => entry.publishedFileId);

    expect(sortWidgetItems(items, { direction: "desc", key: "views" }).map((entry) => entry.publishedFileId))
      .toEqual(["103", "102", "101"]);
    expect(items.map((entry) => entry.publishedFileId)).toEqual(originalOrder);
  });
});
