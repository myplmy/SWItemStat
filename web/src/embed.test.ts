import { describe, expect, it } from "vitest";
import { buildGameWidget, findWidgetItem, parseEmbedConfig } from "./embed";
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

describe("embed configuration", () => {
  it("returns null for the normal dashboard and parses a game widget", () => {
    expect(parseEmbedConfig("?query=test")).toBeNull();
    expect(parseEmbedConfig("?embed=game&app=529340")).toMatchObject({ showList: false });
    expect(parseEmbedConfig("?embed=game&app=529340&density=compact&theme=dark&list=on")).toEqual({
      kind: "game",
      appId: "529340",
      density: "compact",
      showList: true,
      theme: "dark",
    });
  });

  it("defaults invalid options and rejects a malformed item id", () => {
    expect(parseEmbedConfig("?embed=item&id=not-a-number&density=wide&theme=blue")).toEqual({
      kind: "item",
      publishedFileId: null,
      density: "standard",
      theme: "light",
    });
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
