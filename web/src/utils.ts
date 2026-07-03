import type { SortDirection, SortKey, WorkshopItem } from "./types";

const CSV_COLUMNS: Array<{ label: string; value: (item: WorkshopItem) => string | number | null }> = [
  { label: "Workshop ID", value: (item) => item.publishedFileId },
  { label: "게임", value: (item) => item.appName },
  { label: "AppID", value: (item) => item.appId },
  { label: "제목", value: (item) => item.title },
  { label: "방문자", value: (item) => item.views },
  { label: "현재 구독", value: (item) => item.currentSubscriptions },
  { label: "누적 구독", value: (item) => item.lifetimeSubscriptions },
  { label: "현재 즐겨찾기", value: (item) => item.currentFavorites },
  { label: "누적 즐겨찾기", value: (item) => item.lifetimeFavorites },
  { label: "평가 수", value: (item) => item.ratingCount },
  { label: "찬성", value: (item) => item.votesUp },
  { label: "반대", value: (item) => item.votesDown },
  { label: "평가 점수", value: (item) => item.ratingScore },
  { label: "생성일", value: (item) => item.createdAt },
  { label: "수정일", value: (item) => item.updatedAt },
  { label: "URL", value: (item) => item.workshopUrl },
];

export function filterAndSortItems(
  items: WorkshopItem[],
  game: string,
  query: string,
  sortKey: SortKey,
  direction: SortDirection,
): WorkshopItem[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("ko");
  return items
    .filter((item) => game === "all" || item.appId === game)
    .filter((item) => !normalizedQuery || item.title.toLocaleLowerCase("ko").includes(normalizedQuery))
    .sort((left, right) => compare(left[sortKey], right[sortKey], direction));
}

export function buildCsv(items: WorkshopItem[]): string {
  const rows = [
    CSV_COLUMNS.map((column) => escapeCsv(column.label)).join(","),
    ...items.map((item) => CSV_COLUMNS.map((column) => escapeCsv(column.value(item))).join(",")),
  ];
  return `\uFEFF${rows.join("\r\n")}`;
}

export function formatNumber(value: number | null): string {
  return value === null ? "—" : new Intl.NumberFormat("ko-KR").format(value);
}

export function formatScore(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

export function formatVoteRatio(positive: number | null, total: number | null): string {
  if (positive === null || total === null || total <= 0) return "—";
  const percentage = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format((positive / total) * 100);
  return `${formatNumber(positive)}/${formatNumber(total)} (${percentage}%)`;
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function compare(
  left: WorkshopItem[SortKey],
  right: WorkshopItem[SortKey],
  direction: SortDirection,
): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  const order = typeof left === "number" && typeof right === "number"
    ? left - right
    : String(left).localeCompare(String(right), "ko", { numeric: true });
  return direction === "asc" ? order : -order;
}

function escapeCsv(value: string | number | null): string {
  if (value === null) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
