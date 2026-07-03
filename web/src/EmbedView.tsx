import type { EmbedConfig, EmbedDensity, GameWidgetData } from "./embed";
import { buildGameWidget, findWidgetItem } from "./embed";
import type { DashboardData, WorkshopItem } from "./types";
import { formatDate, formatNumber, formatScore } from "./utils";

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
    return <GameWidget className={className} data={data} density={config.density} game={game} />;
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
}: {
  className: string;
  data: DashboardData;
  density: EmbedDensity;
  game: GameWidgetData;
}) {
  const metrics: WidgetMetric[] = [
    { label: "공개 모드", value: formatNumber(game.itemCount) },
    { label: "방문자", value: formatNumber(game.totals.views) },
    { label: "현재 구독", value: formatNumber(game.totals.currentSubscriptions), accent: true },
    { label: "누적 구독", value: formatNumber(game.totals.lifetimeSubscriptions) },
  ];
  if (density !== "compact") {
    metrics.push(
      { label: "현재 즐겨찾기", value: formatNumber(game.totals.currentFavorites) },
      { label: "전체 평가", value: formatNumber(game.totals.ratings) },
    );
  }
  if (density === "full") {
    metrics.splice(metrics.length - 1, 0, {
      label: "누적 즐겨찾기",
      value: formatNumber(game.totals.lifetimeFavorites),
    });
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
  const metrics: WidgetMetric[] = [
    { label: "방문자", value: formatNumber(item.views) },
    { label: "현재 구독", value: formatNumber(item.currentSubscriptions), accent: true },
    { label: "누적 구독", value: formatNumber(item.lifetimeSubscriptions) },
    { label: "평가 점수", value: formatScore(item.ratingScore) },
  ];
  if (density !== "compact") {
    metrics.splice(3, 0,
      { label: "현재 즐겨찾기", value: formatNumber(item.currentFavorites) },
      { label: "누적 즐겨찾기", value: formatNumber(item.lifetimeFavorites) },
    );
  }
  if (density === "full") {
    metrics.push(
      { label: "전체 평가", value: formatNumber(item.ratingCount) },
      { label: "찬성", value: formatNumber(item.votesUp) },
      { label: "반대", value: formatNumber(item.votesDown) },
    );
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
        <div key={metric.label} className={metric.accent ? "is-accent" : undefined}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </div>
      ))}
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
