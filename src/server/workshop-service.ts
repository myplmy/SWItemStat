import type {
  DashboardItem,
  DashboardResponse,
  DiscoveredFiles,
  SteamPublishedFile,
} from "./types.js";
import type { WorkshopDataClient } from "./steam-client.js";

interface ProfileConfig {
  steamId: string;
  vanity: string;
}

export class WorkshopService {
  constructor(
    private readonly client: WorkshopDataClient,
    private readonly profile: ProfileConfig,
  ) {}

  async getDashboard(): Promise<DashboardResponse> {
    const warnings: string[] = [];
    let discovery: DiscoveredFiles;
    try {
      discovery = await this.client.discoverFromApi(this.profile.steamId);
    } catch {
      warnings.push("get-user-files-unavailable");
      discovery = await this.client.discoverFromHtml(this.profile.vanity);
    }

    const discoveredById = indexById(discovery.files);
    const ids = [...discoveredById.keys()];
    const [publicResult, keyedResult] = await Promise.allSettled([
      this.client.getPublicDetails(ids),
      this.client.getKeyedDetails(ids),
    ]);

    const publicFiles = publicResult.status === "fulfilled" ? publicResult.value : discovery.files;
    if (publicResult.status === "rejected") warnings.push("public-details-unavailable");
    const keyedFiles = keyedResult.status === "fulfilled" ? keyedResult.value : discovery.files;
    if (keyedResult.status === "rejected") warnings.push("vote-data-unavailable");

    const publicById = indexById(publicFiles);
    const keyedById = indexById(keyedFiles);
    const items: DashboardItem[] = [];

    for (const id of ids) {
      const discovered = discoveredById.get(id) || {};
      const publicDetail = publicById.get(id) || discovered;
      const keyedDetail = keyedById.get(id) || discovered;
      const merged = { ...discovered, ...publicDetail, vote_data: keyedDetail.vote_data ?? discovered.vote_data };

      if (asInteger(merged.result) !== null && asInteger(merged.result) !== 1) continue;
      if (asId(merged.creator) !== this.profile.steamId) continue;
      if (asInteger(merged.visibility) !== 0) continue;

      const appId =
        asId(merged.consumer_appid) ||
        asId(merged.consumer_app_id) ||
        asId(merged.creator_appid) ||
        asId(merged.creator_app_id);
      if (!appId) continue;

      const votesUp = asInteger(merged.vote_data?.votes_up);
      const votesDown = asInteger(merged.vote_data?.votes_down);
      items.push({
        appId,
        appName: asText(keyedDetail.app_name) || discovery.apps.get(appId) || `App ${appId}`,
        createdAt: asIsoDate(merged.time_created),
        currentFavorites: asInteger(merged.favorited),
        currentSubscriptions: asInteger(merged.subscriptions),
        lifetimeFavorites: asInteger(merged.lifetime_favorited),
        lifetimeSubscriptions: asInteger(merged.lifetime_subscriptions),
        previewUrl: asUrl(merged.preview_url),
        publishedFileId: id,
        ratingCount: votesUp !== null && votesDown !== null ? votesUp + votesDown : null,
        ratingScore: asFiniteNumber(merged.vote_data?.score),
        title: asText(merged.title) || `Workshop item ${id}`,
        updatedAt: asIsoDate(merged.time_updated),
        views: asInteger(merged.views),
        votesDown,
        votesUp,
        workshopUrl: `https://steamcommunity.com/sharedfiles/filedetails/?id=${id}`,
      });
    }

    items.sort((left, right) => (right.updatedAt || "").localeCompare(left.updatedAt || ""));
    if (items.length > 0 && items.every((item) => item.ratingCount === null)) {
      if (!warnings.includes("vote-data-unavailable")) warnings.push("vote-data-unavailable");
    }

    const gameCounts = new Map<string, { name: string; count: number }>();
    for (const item of items) {
      const current = gameCounts.get(item.appId) || { name: item.appName, count: 0 };
      current.count += 1;
      gameCounts.set(item.appId, current);
    }

    return {
      games: [...gameCounts.entries()]
        .map(([appId, value]) => ({ appId, name: value.name, itemCount: value.count }))
        .sort((left, right) => left.name.localeCompare(right.name)),
      items,
      meta: {
        fetchedAt: new Date().toISOString(),
        itemCount: items.length,
        source: discovery.source,
        warnings,
      },
      profile: {
        steamId: this.profile.steamId,
        vanity: this.profile.vanity,
        workshopUrl: `https://steamcommunity.com/id/${encodeURIComponent(this.profile.vanity)}/myworkshopfiles/`,
      },
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
}

function indexById(files: SteamPublishedFile[]): Map<string, SteamPublishedFile> {
  const result = new Map<string, SteamPublishedFile>();
  for (const file of files) {
    const id = asId(file.publishedfileid);
    if (id) result.set(id, file);
  }
  return result;
}

function asId(value: unknown): string | null {
  if (typeof value === "string" && /^\d+$/.test(value)) return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  return null;
}

function asFiniteNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function asInteger(value: unknown): number | null {
  const parsed = asFiniteNumber(value);
  return parsed !== null && Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function asIsoDate(value: unknown): string | null {
  const timestamp = asInteger(value);
  if (timestamp === null) return null;
  const date = new Date(timestamp * 1_000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function sum(items: DashboardItem[], key: keyof DashboardItem): number {
  return items.reduce((total, item) => {
    const value = item[key];
    return total + (typeof value === "number" && Number.isFinite(value) ? value : 0);
  }, 0);
}
