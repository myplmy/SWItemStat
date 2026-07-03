import * as cheerio from "cheerio";
import type { DiscoveredFiles, SteamPublishedFile } from "./types.js";

const API_BASE = "https://api.steampowered.com";
const COMMUNITY_BASE = "https://steamcommunity.com";
const MAX_PAGES = 100;
const MAX_ITEMS = 1_000;
const REQUEST_TIMEOUT_MS = 12_000;

export interface WorkshopDataClient {
  discoverFromApi(steamId: string): Promise<DiscoveredFiles>;
  discoverFromHtml(vanity: string): Promise<DiscoveredFiles>;
  getKeyedDetails(ids: string[]): Promise<SteamPublishedFile[]>;
  getPublicDetails(ids: string[]): Promise<SteamPublishedFile[]>;
}

export class SteamClient implements WorkshopDataClient {
  constructor(
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async discoverFromApi(steamId: string): Promise<DiscoveredFiles> {
    const files: SteamPublishedFile[] = [];
    const apps = new Map<string, string>();
    const seen = new Set<string>();

    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const url = new URL(`${API_BASE}/IPublishedFileService/GetUserFiles/v1/`);
      url.searchParams.set("key", this.apiKey);
      url.searchParams.set("steamid", steamId);
      url.searchParams.set("page", String(page));
      url.searchParams.set("numperpage", "100");
      url.searchParams.set("type", "myfiles");
      url.searchParams.set("sortmethod", "lastupdated");
      url.searchParams.set("return_vote_data", "true");
      url.searchParams.set("return_previews", "true");
      url.searchParams.set("return_short_description", "true");
      url.searchParams.set("format", "json");

      const payload = await this.fetchJson(url, undefined, "GetUserFiles");
      const response = asRecord(payload.response);
      const pageFiles = Array.isArray(response.publishedfiledetails)
        ? response.publishedfiledetails.filter(isRecord)
        : [];
      if (pageFiles.length === 0) break;

      for (const file of pageFiles) {
        const id = asId(file.publishedfileid);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        files.push(file);
      }

      if (Array.isArray(response.apps)) {
        for (const entry of response.apps.filter(isRecord)) {
          const appId = asId(entry.appid);
          if (appId) apps.set(appId, asText(entry.name) || `App ${appId}`);
        }
      }

      const total = asNumber(response.total);
      if (files.length >= MAX_ITEMS || (total !== null && files.length >= total)) break;
      if (pageFiles.length < 100) break;
    }

    if (files.length === 0) throw new Error("GetUserFiles returned no usable items.");
    return { apps, files, source: "get-user-files" };
  }

  async discoverFromHtml(vanity: string): Promise<DiscoveredFiles> {
    const files: SteamPublishedFile[] = [];
    const apps = new Map<string, string>();
    const seen = new Set<string>();
    let expectedPages = 1;

    for (let page = 1; page <= Math.min(expectedPages, MAX_PAGES); page += 1) {
      const url = new URL(`${COMMUNITY_BASE}/id/${encodeURIComponent(vanity)}/myworkshopfiles/`);
      url.searchParams.set("p", String(page));
      url.searchParams.set("appid", "0");
      const html = await this.fetchText(url, "Workshop profile HTML");
      const parsed = parseWorkshopHtml(html);
      expectedPages = Math.max(expectedPages, parsed.totalPages);

      for (const [appId, name] of parsed.apps) apps.set(appId, name);
      let added = 0;
      for (const file of parsed.files) {
        const id = asId(file.publishedfileid);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        files.push(file);
        added += 1;
      }
      if (files.length >= MAX_ITEMS || added === 0) break;
    }

    if (files.length === 0) throw new Error("Workshop HTML returned no usable items.");
    return { apps, files, source: "html-fallback" };
  }

  async getPublicDetails(ids: string[]): Promise<SteamPublishedFile[]> {
    const results: SteamPublishedFile[] = [];
    for (const batch of chunks(ids, 100)) {
      const body = new URLSearchParams({ itemcount: String(batch.length) });
      batch.forEach((id, index) => body.set(`publishedfileids[${index}]`, id));
      const payload = await this.fetchJson(
        new URL(`${API_BASE}/ISteamRemoteStorage/GetPublishedFileDetails/v1/`),
        { method: "POST", body },
        "GetPublishedFileDetails",
      );
      const response = asRecord(payload.response);
      if (Array.isArray(response.publishedfiledetails)) {
        results.push(...response.publishedfiledetails.filter(isRecord));
      }
    }
    return results;
  }

  async getKeyedDetails(ids: string[]): Promise<SteamPublishedFile[]> {
    const results: SteamPublishedFile[] = [];
    for (const batch of chunks(ids, 50)) {
      const url = new URL(`${API_BASE}/IPublishedFileService/GetDetails/v1/`);
      url.searchParams.set("key", this.apiKey);
      url.searchParams.set("includevotes", "true");
      url.searchParams.set("includetags", "false");
      url.searchParams.set("includechildren", "false");
      url.searchParams.set("short_description", "true");
      url.searchParams.set("format", "json");
      batch.forEach((id, index) => url.searchParams.set(`publishedfileids[${index}]`, id));
      const payload = await this.fetchJson(url, undefined, "GetDetails");
      const response = asRecord(payload.response);
      if (Array.isArray(response.publishedfiledetails)) {
        results.push(...response.publishedfiledetails.filter(isRecord));
      }
    }
    return results;
  }

  private async fetchJson(url: URL, init: RequestInit | undefined, label: string): Promise<Record<string, unknown>> {
    const response = await this.fetcher(url, {
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`${label} failed with status ${response.status}.`);
    const payload: unknown = await response.json();
    if (!isRecord(payload)) throw new Error(`${label} returned malformed JSON.`);
    return payload;
  }

  private async fetchText(url: URL, label: string): Promise<string> {
    const response = await this.fetcher(url, {
      headers: { Accept: "text/html", "User-Agent": "WorkshopDashboard/1.0" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`${label} failed with status ${response.status}.`);
    return response.text();
  }
}

export function parseWorkshopHtml(html: string): {
  apps: Map<string, string>;
  files: SteamPublishedFile[];
  totalPages: number;
} {
  const $ = cheerio.load(html);
  const apps = new Map<string, string>();
  const files: SteamPublishedFile[] = [];
  let totalPages = 1;

  $("[id^='sharedfiles_filterselect_app_option_']").each((_, element) => {
    const onclick = $(element).attr("onclick") || "";
    const match = onclick.match(/['\"]appid['\"]\s*:\s*['\"](\d+)['\"]/);
    const name = $(element).text().trim();
    if (match?.[1] && match[1] !== "0" && name) apps.set(match[1], name);
  });

  $("a.ugc[data-publishedfileid][data-appid]").each((_, element) => {
    const publishedfileid = $(element).attr("data-publishedfileid");
    const appid = $(element).attr("data-appid");
    if (publishedfileid && appid) {
      files.push({ publishedfileid, consumer_appid: appid });
    }
  });

  $(".workshopBrowsePagingControls a").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;
    const match = href.match(/[?&]p=(\d+)/);
    if (match?.[1]) totalPages = Math.max(totalPages, Number(match[1]));
  });

  return { apps, files, totalPages };
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asId(value: unknown): string | null {
  if (typeof value === "string" && /^\d+$/.test(value)) return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
