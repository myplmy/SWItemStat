import type { CSSProperties } from "react";
import type { EmbedConfig, EmbedDensity, GameWidgetData } from "./embed";
import { buildGameWidget, findWidgetItem } from "./embed";
import type { DashboardData, WorkshopItem } from "./types";
import {
  formatDate,
  formatNumber,
  formatNumberPair,
  formatScore,
  formatSubscriptionRate,
  formatVoteRatio,
} from "./utils";

interface EmbedViewProps {
  config: EmbedConfig;
  data: DashboardData | null;
  error: string | null;
  loading: boolean;
}

interface WidgetMetric {
  label: string;
  value: string;
  accent?: boolean;
  fit?: boolean;
}

export default function EmbedView({ config, data, error, loading }: EmbedViewProps) {
  const className = `embed-page theme-${config.theme} density-${config.density}`;

  if (loading) {
    return (
      <main className={className}>
        <EmbedStatus title="통계를 불러오는 중입니다" detail="Steam Workshop 데이터를 확인하고 있습니다." />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className={className}>
        <EmbedStatus error title="통계를 불러오지 못했습니다" detail={error || "응답 데이터가 없습니다."} />
      </main>
    );
  }

  if (config.kind === "game") {
    if (!config.appId) {
      return <EmbedError className={className} detail="유효한 app 쿼리 파라미터가 필요합니다." />;
    }
    const game = buildGameWidget(data, config.appId);
    if (!game) {
      return <EmbedError className={className} detail={`AppID ${config.appId}의 공개 항목을 찾을 수 없습니다.`} />;
    }
    return (
      <GameWidget
        className={className}
        data={data}
        density={config.density}
        game={game}
        showList={config.showList}
      />
    );
  }

  if (!config.publishedFileId) {
    return <EmbedError className={className} detail="유효한 id 쿼리 파라미터가 필요합니다." />;
  }
  const item = findWidgetItem(data, config.publishedFileId);
  if (!item) {
    return <EmbedError className={className} detail={`Workshop ID ${config.publishedFileId}를 찾을 수 없습니다.`} />;
  }
  return <ItemWidget className={className} data={data} density={config.density} item={item} />;
}

function GameWidget({
  className,
  data,
  density,
  game,
  showList,
}: {
  className: string;
  data: DashboardData;
  density: EmbedDensity;
  game: GameWidgetData;
  showList: boolean;
}) {
  let metrics: WidgetMetric[];
  if (density === "notion") {
    metrics = [
      { label: "방문자", value: formatNumber(game.totals.views) },
      {
        label: "구독수(현재/누적)",
        value: formatNumberPair(game.totals.currentSubscriptions, game.totals.lifetimeSubscriptions),
        accent: true,
        fit: true,
      },
      {
        label: "즐겨찾기(현재/누적)",
        value: formatNumberPair(game.totals.currentFavorites, game.totals.lifetimeFavorites),
        fit: true,
      },
      {
        label: "긍정평가/전체평가",
        value: formatVoteRatio(game.positiveRatings, game.totals.ratings),
        fit: true,
      },
      {
        label: "구독률",
        value: formatSubscriptionRate(game.totals.currentSubscriptions, game.totals.views),
      },
    ];
  } else {
    metrics = [
      { label: "공개 모드", value: formatNumber(game.itemCount) },
      { label: "방문자", value: formatNumber(game.totals.views) },
      { label: "현재 구독", value: formatNumber(game.totals.currentSubscriptions), accent: true },
      { label: "누적 구독", value: formatNumber(game.totals.lifetimeSubscriptions) },
    ];
  }
  if (density === "standard") {
    metrics.push(
      { label: "현재 즐겨찾기", value: formatNumber(game.totals.currentFavorites) },
      {
        label: "긍정평가/전체평가",
        value: formatVoteRatio(game.positiveRatings, game.totals.ratings),
        fit: true,
      },
    );
  }
  if (density === "full") {
    metrics.push(
      { label: "현재 즐겨찾기", value: formatNumber(game.totals.currentFavorites) },
      { label: "누적 즐겨찾기", value: formatNumber(game.totals.lifetimeFavorites) },
      {
        label: "긍정평가/전체평가",
        value: formatVoteRatio(game.positiveRatings, game.totals.ratings),
        fit: true,
      },
    );
  }

  return (
    <main className={className}>
      <article className="embed-card">
        <WidgetHeader
          eyebrow="STEAM WORKSHOP · GAME SUMMARY"
          title={game.appName}
          subtitle={`myplmy의 공개 모드 ${formatNumber(game.itemCount)}개`}
          url={data.profile.workshopUrl}
        />
        <MetricGrid metrics={metrics} />
        {showList && <GameModList density={density} items={game.items} />}
        <WidgetFooter fetchedAt={data.meta.fetchedAt} warningCount={data.meta.warnings.length} />
      </article>
    </main>
  );
}

function ItemWidget({
  className,
  data,
  density,
  item,
}: {
  className: string;
  data: DashboardData;
  density: EmbedDensity;
  item: WorkshopItem;
}) {
  let metrics: WidgetMetric[];
  if (density === "compact") {
    metrics = [
      { label: "방문자", value: formatNumber(item.views) },
      { label: "현재 구독", value: formatNumber(item.currentSubscriptions), accent: true },
      { label: "누적 구독", value: formatNumber(item.lifetimeSubscriptions) },
      { label: "평가 점수", value: formatScore(item.ratingScore) },
    ];
  } else if (density === "standard") {
    metrics = [
      { label: "방문자", value: formatNumber(item.views) },
      { label: "현재 구독", value: formatNumber(item.currentSubscriptions), accent: true },
      { label: "누적 구독", value: formatNumber(item.lifetimeSubscriptions) },
      { label: "현재 즐겨찾기", value: formatNumber(item.currentFavorites) },
      { label: "누적 즐겨찾기", value: formatNumber(item.lifetimeFavorites) },
      {
        label: "긍정평가/전체평가",
        value: formatVoteRatio(item.votesUp, item.ratingCount),
        fit: true,
      },
    ];
  } else if (density === "notion") {
    metrics = [
      { label: "방문자", value: formatNumber(item.views) },
      {
        label: "구독수(현재/누적)",
        value: formatNumberPair(item.currentSubscriptions, item.lifetimeSubscriptions),
        accent: true,
        fit: true,
      },
      {
        label: "즐겨찾기(현재/누적)",
        value: formatNumberPair(item.currentFavorites, item.lifetimeFavorites),
        fit: true,
      },
      {
        label: "긍정평가/전체평가",
        value: formatVoteRatio(item.votesUp, item.ratingCount),
        fit: true,
      },
      {
        label: "구독률",
        value: formatSubscriptionRate(item.currentSubscriptions, item.views),
      },
    ];
  } else {
    metrics = [
      { label: "방문자", value: formatNumber(item.views) },
      { label: "현재 구독", value: formatNumber(item.currentSubscriptions), accent: true },
      { label: "누적 구독", value: formatNumber(item.lifetimeSubscriptions) },
      { label: "현재 즐겨찾기", value: formatNumber(item.currentFavorites) },
      { label: "누적 즐겨찾기", value: formatNumber(item.lifetimeFavorites) },
      { label: "평가 점수", value: formatScore(item.ratingScore) },
      { label: "전체 평가", value: formatNumber(item.ratingCount) },
      { label: "찬성", value: formatNumber(item.votesUp) },
      { label: "반대", value: formatNumber(item.votesDown) },
    ];
  }

  return (
    <main className={className}>
      <article className="embed-card">
        <WidgetHeader
          eyebrow={`STEAM WORKSHOP · ${item.appName}`}
          imageUrl={density === "compact" ? null : item.previewUrl}
          title={item.title}
          subtitle={`Workshop ID ${item.publishedFileId}`}
          url={item.workshopUrl}
        />
        <MetricGrid metrics={metrics} />
        {density === "full" && (
          <dl className="embed-dates">
            <div><dt>등록</dt><dd>{formatDate(item.createdAt)}</dd></div>
            <div><dt>최근 수정</dt><dd>{formatDate(item.updatedAt)}</dd></div>
          </dl>
        )}
        <WidgetFooter fetchedAt={data.meta.fetchedAt} warningCount={data.meta.warnings.length} />
      </article>
    </main>
  );
}

function WidgetHeader({
  eyebrow,
  imageUrl,
  subtitle,
  title,
  url,
}: {
  eyebrow: string;
  imageUrl?: string | null;
  subtitle: string;
  title: string;
  url: string;
}) {
  return (
    <header className="embed-header">
      {imageUrl && <img src={imageUrl} alt="" loading="lazy" />}
      <div className="embed-heading">
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        <span>{subtitle}</span>
      </div>
      <a href={url} target="_blank" rel="noreferrer" aria-label="Steam에서 보기">↗</a>
    </header>
  );
}

function MetricGrid({ metrics }: { metrics: WidgetMetric[] }) {
  return (
    <section className="embed-metrics" aria-label="Workshop 통계">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className={[metric.accent ? "is-accent" : "", metric.fit ? "is-fit" : ""].filter(Boolean).join(" ") || undefined}
        >
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </div>
      ))}
    </section>
  );
}

interface ListColumn {
  label: string;
  value: (item: WorkshopItem) => string;
}

function GameModList({ density, items }: { density: EmbedDensity; items: WorkshopItem[] }) {
  let columns: ListColumn[];
  if (density === "notion") {
    columns = [
      { label: "방문자", value: (item) => formatNumber(item.views) },
      {
        label: "구독수(현재/누적)",
        value: (item) => formatNumberPair(item.currentSubscriptions, item.lifetimeSubscriptions),
      },
      {
        label: "즐겨찾기(현재/누적)",
        value: (item) => formatNumberPair(item.currentFavorites, item.lifetimeFavorites),
      },
      {
        label: "긍정평가/전체평가",
        value: (item) => formatVoteRatio(item.votesUp, item.ratingCount),
      },
      {
        label: "구독률",
        value: (item) => formatSubscriptionRate(item.currentSubscriptions, item.views),
      },
    ];
  } else {
    columns = [
      { label: "방문자", value: (item) => formatNumber(item.views) },
      { label: "현재 구독", value: (item) => formatNumber(item.currentSubscriptions) },
      { label: "누적 구독", value: (item) => formatNumber(item.lifetimeSubscriptions) },
    ];
    if (density !== "compact") {
      columns.push({ label: "현재 즐겨찾기", value: (item) => formatNumber(item.currentFavorites) });
    }
    if (density === "full") {
      columns.push({ label: "누적 즐겨찾기", value: (item) => formatNumber(item.lifetimeFavorites) });
    }
    if (density !== "compact") {
      columns.push({
        label: "긍정평가/전체평가",
        value: (item) => formatVoteRatio(item.votesUp, item.ratingCount),
      });
    }
    if (density === "full") {
      columns.push(
        { label: "평가 점수", value: (item) => formatScore(item.ratingScore) },
        { label: "최근 수정", value: (item) => formatDate(item.updatedAt) },
      );
    }
  }

  const gridStyle = {
    gridTemplateColumns: density === "notion"
      ? `minmax(120px, 1.45fr) repeat(${columns.length}, minmax(0, 1fr))`
      : `minmax(220px, 1.8fr) repeat(${columns.length}, minmax(92px, .7fr))`,
  } satisfies CSSProperties;

  const listClassName = [
    "embed-list",
    `list-${density}`,
    items.length >= 10 ? "is-scrollable" : "",
  ].filter(Boolean).join(" ");

  return (
    <section className={listClassName} aria-label="게임별 모드 통계 목록">
      <div className="embed-list-grid" role="table">
        <div className="embed-list-header" role="row" style={gridStyle}>
          <span role="columnheader">모드</span>
          {columns.map((column) => <span key={column.label} role="columnheader">{column.label}</span>)}
        </div>
        {items.map((item) => (
          <div className="embed-list-row" key={item.publishedFileId} role="row" style={gridStyle}>
            <a href={item.workshopUrl} target="_blank" rel="noreferrer" role="cell" title={item.title}>
              {item.title}
            </a>
            {columns.map((column) => (
              <span key={column.label} role="cell">{column.value(item)}</span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function WidgetFooter({ fetchedAt, warningCount }: { fetchedAt: string; warningCount: number }) {
  return (
    <footer className="embed-footer">
      <span>업데이트 {formatDate(fetchedAt)}</span>
      {warningCount > 0 && <span className="embed-warning">일부 통계 지연</span>}
    </footer>
  );
}

function EmbedError({ className, detail }: { className: string; detail: string }) {
  return (
    <main className={className}>
      <EmbedStatus error title="위젯을 표시할 수 없습니다" detail={detail} />
    </main>
  );
}

function EmbedStatus({ title, detail, error = false }: { title: string; detail: string; error?: boolean }) {
  return (
    <section className={`embed-status${error ? " error" : ""}`} role={error ? "alert" : "status"}>
      <div className="status-dot" />
      <div><strong>{title}</strong><p>{detail}</p></div>
    </section>
  );
}
