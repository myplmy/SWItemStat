import { describe, expect, it } from "vitest";
import { buildEmbedSampleUrl } from "./EmbedSamples";

describe("embed sample URLs", () => {
  it("builds a game widget URL with every game-only option", () => {
    const url = new URL(buildEmbedSampleUrl("https://example.test/SWItemStat/?view=embed-samples", {
      appId: "294100",
      canvas: "notion",
      density: "notion",
      itemId: "unused",
      kind: "game",
      showList: true,
      theme: "dark",
    }));

    expect(url.pathname).toBe("/SWItemStat/");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      app: "294100",
      canvas: "notion",
      density: "notion",
      embed: "game",
      list: "on",
      theme: "dark",
    });
  });

  it("builds an item widget URL without the game list option", () => {
    const url = new URL(buildEmbedSampleUrl("https://example.test/SWItemStat/?view=embed-samples", {
      appId: "unused",
      canvas: "transparent",
      density: "full",
      itemId: "3547456198",
      kind: "item",
      showList: true,
      theme: "light",
    }));

    expect(url.searchParams.get("id")).toBe("3547456198");
    expect(url.searchParams.get("list")).toBeNull();
    expect(url.searchParams.get("canvas")).toBe("transparent");
  });
});
