export interface WorkshopItem {
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

export interface DashboardData {
  games: Array<{ appId: string; name: string; itemCount: number }>;
  items: WorkshopItem[];
  meta: {
    fetchedAt: string;
    itemCount: number;
    source: "get-user-files" | "html-fallback";
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

export type SortKey =
  | "appName"
  | "currentFavorites"
  | "currentSubscriptions"
  | "lifetimeFavorites"
  | "lifetimeSubscriptions"
  | "ratingCount"
  | "ratingScore"
  | "title"
  | "updatedAt"
  | "views";

export type SortDirection = "asc" | "desc";
