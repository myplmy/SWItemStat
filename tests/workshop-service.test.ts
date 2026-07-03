import { describe, expect, it, vi } from "vitest";
import type { WorkshopDataClient } from "../src/server/steam-client.js";
import { WorkshopService } from "../src/server/workshop-service.js";

const owner = "76561197991373987";

function createClient(): WorkshopDataClient {
  return {
    discoverFromApi: vi.fn().mockResolvedValue({
      apps: new Map([["529340", "Victoria 3"]]),
      files: [
        { publishedfileid: "100", consumer_appid: 529340 },
        { publishedfileid: "200", consumer_appid: 529340 },
        { publishedfileid: "300", consumer_appid: 529340 },
      ],
      source: "get-user-files",
    }),
    discoverFromHtml: vi.fn(),
    getPublicDetails: vi.fn().mockResolvedValue([
      {
        publishedfileid: "100",
        result: 1,
        creator: owner,
        consumer_app_id: 529340,
        visibility: 0,
        title: "Public item",
        views: 10,
        subscriptions: 5,
        lifetime_subscriptions: 8,
        favorited: 2,
        lifetime_favorited: 3,
        time_updated: 1_700_000_000,
      },
      {
        publishedfileid: "200",
        result: 1,
        creator: "76561198000000000",
        consumer_app_id: 529340,
        visibility: 0,
      },
      {
        publishedfileid: "300",
        result: 1,
        creator: owner,
        consumer_app_id: 529340,
        visibility: 2,
      },
    ]),
    getKeyedDetails: vi.fn().mockResolvedValue([
      {
        publishedfileid: "100",
        app_name: "Victoria 3",
        vote_data: { votes_up: 9, votes_down: 1, score: 0.9 },
      },
    ]),
  };
}

describe("WorkshopService", () => {
  it("normalizes totals and filters forged and non-public items", async () => {
    const result = await new WorkshopService(createClient(), { steamId: owner, vanity: "myplmy" }).getDashboard();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      publishedFileId: "100",
      ratingCount: 10,
      views: 10,
    });
    expect(result.totals).toMatchObject({
      currentSubscriptions: 5,
      lifetimeSubscriptions: 8,
      ratings: 10,
      views: 10,
    });
  });

  it("uses HTML discovery when GetUserFiles fails", async () => {
    const client = createClient();
    vi.mocked(client.discoverFromApi).mockRejectedValue(new Error("upstream failure"));
    vi.mocked(client.discoverFromHtml).mockResolvedValue({
      apps: new Map([["529340", "Victoria 3"]]),
      files: [{ publishedfileid: "100", consumer_appid: 529340 }],
      source: "html-fallback",
    });
    const result = await new WorkshopService(client, { steamId: owner, vanity: "myplmy" }).getDashboard();
    expect(result.meta.source).toBe("html-fallback");
    expect(result.meta.warnings).toContain("get-user-files-unavailable");
  });
});
