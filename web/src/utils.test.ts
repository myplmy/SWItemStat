import { describe, expect, it } from "vitest";
import type { WorkshopItem } from "./types";
import {
  buildCsv,
  filterAndSortItems,
  formatNumberPair,
  formatSubscriptionRate,
  formatVoteRatio,
} from "./utils";

const base: WorkshopItem = {
  appId: "529340",
  appName: "Victoria 3",
  createdAt: null,
  currentFavorites: 1,
  currentSubscriptions: 2,
  lifetimeFavorites: 3,
  lifetimeSubscriptions: 4,
  previewUrl: null,
  publishedFileId: "1",
  ratingCount: 5,
  ratingScore: 0.9,
  title: "Alpha, Mod",
  updatedAt: "2026-01-01T00:00:00.000Z",
  views: 10,
  votesDown: 1,
  votesUp: 4,
  workshopUrl: "https://example.test/1",
};

describe("dashboard utilities", () => {
  it("filters and sorts without mutating source data", () => {
    const second = { ...base, publishedFileId: "2", title: "Beta", views: 20 };
    const source = [base, second];
    const result = filterAndSortItems(source, "529340", "", "views", "desc");
    expect(result.map((item) => item.publishedFileId)).toEqual(["2", "1"]);
    expect(source.map((item) => item.publishedFileId)).toEqual(["1", "2"]);
  });

  it("escapes commas in CSV fields", () => {
    const csv = buildCsv([base]);
    expect(csv).toContain('"Alpha, Mod"');
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });

  it("formats positive and total ratings as a ratio and percentage", () => {
    expect(formatVoteRatio(4, 5)).toBe("4/5 (80%)");
    expect(formatVoteRatio(2, 3)).toBe("2/3 (66.7%)");
    expect(formatVoteRatio(null, 5)).toBe("—");
    expect(formatVoteRatio(0, 0)).toBe("—");
  });

  it("formats paired totals and the current subscription rate", () => {
    expect(formatNumberPair(334, 1082)).toBe("334 / 1,082");
    expect(formatNumberPair(null, 1082)).toBe("— / 1,082");
    expect(formatSubscriptionRate(334, 1632)).toBe("20.5%");
    expect(formatSubscriptionRate(1, 0)).toBe("—");
  });
});
