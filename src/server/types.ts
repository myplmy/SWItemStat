export interface SteamVoteData {
  score?: unknown;
  votes_up?: unknown;
  votes_down?: unknown;
}

export interface SteamPublishedFile {
  result?: unknown;
  publishedfileid?: unknown;
  creator?: unknown;
  creator_app_id?: unknown;
  creator_appid?: unknown;
  consumer_app_id?: unknown;
  consumer_appid?: unknown;
  title?: unknown;
  preview_url?: unknown;
  time_created?: unknown;
  time_updated?: unknown;
  visibility?: unknown;
  subscriptions?: unknown;
  favorited?: unknown;
  lifetime_subscriptions?: unknown;
  lifetime_favorited?: unknown;
  views?: unknown;
  app_name?: unknown;
  vote_data?: SteamVoteData;
}

export interface DiscoveredFiles {
  apps: Map<string, string>;
  files: SteamPublishedFile[];
  source: "get-user-files" | "html-fallback";
}

export interface DashboardItem {
  appId: string;
  appName: string;
  createdAt: string | null;
  currentFavorites: number | null;
  currentSubscriptions: number | null;
  lifetimeFavorites: number | null;
  lifetimeSubscriptions: number | null;
  previewUrl: string | null;
  publishedFileId: string;
  ratingCount: number | null;
  ratingScore: number | null;
  title: string;
  updatedAt: string | null;
  views: number | null;
  votesDown: number | null;
  votesUp: number | null;
  workshopUrl: string;
}

export interface DashboardResponse {
  games: Array<{ appId: string; name: string; itemCount: number }>;
  items: DashboardItem[];
  meta: {
    fetchedAt: string;
    itemCount: number;
    source: DiscoveredFiles["source"];
    warnings: string[];
  };
  profile: {
    steamId: string;
    vanity: string;
    workshopUrl: string;
  };
  totals: {
    currentFavorites: number;
    currentSubscriptions: number;
    lifetimeFavorites: number;
    lifetimeSubscriptions: number;
    ratings: number;
    views: number;
  };
}
