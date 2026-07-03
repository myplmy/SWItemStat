import { useEffect, useMemo, useState } from "react";
import type { DashboardData, SortDirection, SortKey, WorkshopItem } from "./types";
import { buildCsv, filterAndSortItems, formatDate, formatNumber, formatScore } from "./utils";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

const columns: Array<{ key: SortKey; label: string; align?: "right" }> = [
  { key: "appName", label: "게임" },
  { key: "title", label: "아이템" },
  { key: "views", label: "방문자", align: "right" },
  { key: "currentSubscriptions", label: "현재 구독", align: "right" },
  { key: "lifetimeSubscriptions", label: "누적 구독", align: "right" },
  { key: "currentFavorites", label: "현재 즐겨찾기", align: "right" },
  { key: "lifetimeFavorites", label: "누적 즐겨찾기", align: "right" },
  { key: "ratingCount", label: "평가", align: "right" },
  { key: "ratingScore", label: "점수", align: "right" },
  { key: "updatedAt", label: "최근 수정" },
];

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`${API_BASE}/workshop`, { headers: { Accept: "application/json" }, signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`API 요청 실패 (${response.status})`);
        return response.json() as Promise<DashboardData>;
      })
      .then((payload) => {
        setData(payload);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "통계를 불러오지 못했습니다.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const visibleItems = useMemo(
    () => filterAndSortItems(data?.items || [], game, query, sortKey, sortDirection),
    [data?.items, game, query, sortDirection, sortKey],
  );

  function changeSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(nextKey);
      setSortDirection(nextKey === "title" || nextKey === "appName" ? "asc" : "desc");
    }
  }

  function downloadCsv() {
    if (!data) return;
    const blob = new Blob([buildCsv(visibleItems)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `steam-workshop-${data.profile.vanity}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main>
      <header className="hero">
        <div>
          <p className="eyebrow">STEAM WORKSHOP ANALYTICS</p>
          <h1>{data?.profile.vanity || "myplmy"}<span>의 창작마당 통계</span></h1>
          <p className="subtitle">공개 아이템의 현재 성과와 누적 지표를 한 화면에서 비교합니다.</p>
        </div>
        {data && (
          <a className="steam-link" href={data.profile.workshopUrl} target="_blank" rel="noreferrer">
            Steam에서 보기 <span aria-hidden="true">↗</span>
          </a>
        )}
      </header>

      {loading && <StatusPanel title="통계를 불러오는 중입니다" detail="Steam 응답을 정리하고 있습니다." />}
      {error && <StatusPanel error title="데이터를 불러오지 못했습니다" detail={error} />}

      {data && !loading && (
        <>
          <section className="summary" aria-label="전체 통계">
            <Metric label="공개 아이템" value={data.meta.itemCount} />
            <Metric label="방문자" value={data.totals.views} />
            <Metric label="현재 구독" value={data.totals.currentSubscriptions} />
            <Metric label="누적 구독" value={data.totals.lifetimeSubscriptions} />
            <Metric label="현재 즐겨찾기" value={data.totals.currentFavorites} />
            <Metric label="전체 평가" value={data.totals.ratings} />
          </section>

          {data.meta.warnings.length > 0 && (
            <div className="warning" role="status">
              일부 Steam 통계를 가져오지 못해 해당 값은 —로 표시될 수 있습니다.
            </div>
          )}

          <section className="controls" aria-label="목록 필터">
            <label>
              <span>게임</span>
              <select value={game} onChange={(event) => setGame(event.target.value)}>
                <option value="all">모든 게임 ({data.meta.itemCount})</option>
                {data.games.map((entry) => (
                  <option key={entry.appId} value={entry.appId}>
                    {entry.name} ({entry.itemCount})
                  </option>
                ))}
              </select>
            </label>
            <label className="search-field">
              <span>아이템 검색</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="제목으로 검색"
              />
            </label>
            <button className="export-button" type="button" onClick={downloadCsv} disabled={visibleItems.length === 0}>
              CSV 내보내기
            </button>
          </section>

          <div className="result-meta">
            <strong>{formatNumber(visibleItems.length)}</strong>개 표시
            <span>업데이트 {formatDate(data.meta.fetchedAt)}</span>
          </div>

          <section className="table-shell" aria-label="Workshop 아이템 통계">
            <table>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} className={column.align === "right" ? "numeric" : undefined}>
                      <button type="button" onClick={() => changeSort(column.key)}>
                        {column.label}
                        <span className="sort-indicator" aria-hidden="true">
                          {sortKey === column.key ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                        </span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => <ItemRow key={item.publishedFileId} item={item} />)}
              </tbody>
            </table>
            {visibleItems.length === 0 && <div className="empty">조건에 맞는 아이템이 없습니다.</div>}
          </section>
        </>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </article>
  );
}

function StatusPanel({ title, detail, error = false }: { title: string; detail: string; error?: boolean }) {
  return (
    <section className={`status-panel${error ? " error" : ""}`} role={error ? "alert" : "status"}>
      <div className="status-dot" />
      <div><strong>{title}</strong><p>{detail}</p></div>
    </section>
  );
}

function ItemRow({ item }: { item: WorkshopItem }) {
  return (
    <tr>
      <td><span className="game-pill">{item.appName}</span></td>
      <td>
        <a className="item-title" href={item.workshopUrl} target="_blank" rel="noreferrer">
          {item.previewUrl ? <img src={item.previewUrl} alt="" loading="lazy" /> : <span className="preview-placeholder" />}
          <span><strong>{item.title}</strong><small>ID {item.publishedFileId}</small></span>
        </a>
      </td>
      <td className="numeric">{formatNumber(item.views)}</td>
      <td className="numeric accent">{formatNumber(item.currentSubscriptions)}</td>
      <td className="numeric">{formatNumber(item.lifetimeSubscriptions)}</td>
      <td className="numeric">{formatNumber(item.currentFavorites)}</td>
      <td className="numeric">{formatNumber(item.lifetimeFavorites)}</td>
      <td className="numeric" title={`찬성 ${formatNumber(item.votesUp)} · 반대 ${formatNumber(item.votesDown)}`}>
        {formatNumber(item.ratingCount)}
      </td>
      <td className="numeric">{formatScore(item.ratingScore)}</td>
      <td className="date-cell">{formatDate(item.updatedAt)}</td>
    </tr>
  );
}
