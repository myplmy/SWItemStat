import { useMemo, useState } from "react";
import type { EmbedCanvas, EmbedDensity, EmbedTheme } from "./embed";

type EmbedKind = "game" | "item";

export interface EmbedSampleOptions {
  appId: string;
  canvas: EmbedCanvas;
  density: EmbedDensity;
  itemId: string;
  kind: EmbedKind;
  showList: boolean;
  theme: EmbedTheme;
}

export function buildEmbedSampleUrl(baseUrl: string, options: EmbedSampleOptions): string {
  const url = new URL(baseUrl);
  url.hash = "";
  url.search = "";
  url.searchParams.set("embed", options.kind);
  if (options.kind === "game") {
    url.searchParams.set("app", options.appId.trim());
    url.searchParams.set("list", options.showList ? "on" : "off");
  } else {
    url.searchParams.set("id", options.itemId.trim());
  }
  url.searchParams.set("density", options.density);
  url.searchParams.set("theme", options.theme);
  url.searchParams.set("canvas", options.canvas);
  return url.toString();
}

export default function EmbedSamples() {
  const [kind, setKind] = useState<EmbedKind>("game");
  const [appId, setAppId] = useState("294100");
  const [itemId, setItemId] = useState("3547456198");
  const [density, setDensity] = useState<EmbedDensity>("notion");
  const [theme, setTheme] = useState<EmbedTheme>("dark");
  const [canvas, setCanvas] = useState<EmbedCanvas>("notion");
  const [showList, setShowList] = useState(true);
  const [copied, setCopied] = useState(false);

  const previewUrl = useMemo(
    () => buildEmbedSampleUrl(window.location.href, {
      appId,
      canvas,
      density,
      itemId,
      kind,
      showList,
      theme,
    }),
    [appId, canvas, density, itemId, kind, showList, theme],
  );

  const previewHeight = kind === "game" && showList
    ? 680
    : density === "full"
      ? 560
      : 360;

  async function copyUrl() {
    await navigator.clipboard.writeText(previewUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <main className="sample-page">
      <header className="sample-header">
        <div>
          <p className="eyebrow">EMBED WIDGET LAB</p>
          <h1>임베드 위젯 샘플</h1>
          <p className="subtitle">옵션을 조합해 GitHub Pages 위젯을 바로 확인합니다.</p>
        </div>
        <a className="steam-link" href={window.location.pathname}>대시보드로 돌아가기</a>
      </header>

      <section className="sample-controls" aria-label="임베드 위젯 옵션">
        <label>
          <span>위젯 종류</span>
          <select value={kind} onChange={(event) => setKind(event.target.value as EmbedKind)}>
            <option value="game">게임 요약</option>
            <option value="item">개별 모드</option>
          </select>
        </label>

        {kind === "game" ? (
          <label>
            <span>Steam AppID</span>
            <input value={appId} onChange={(event) => setAppId(event.target.value)} inputMode="numeric" />
          </label>
        ) : (
          <label>
            <span>Workshop ID</span>
            <input value={itemId} onChange={(event) => setItemId(event.target.value)} inputMode="numeric" />
          </label>
        )}

        <label>
          <span>Density</span>
          <select value={density} onChange={(event) => setDensity(event.target.value as EmbedDensity)}>
            <option value="compact">compact</option>
            <option value="standard">standard</option>
            <option value="full">full</option>
            <option value="notion">notion</option>
          </select>
        </label>

        <label>
          <span>Theme fallback</span>
          <select value={theme} onChange={(event) => setTheme(event.target.value as EmbedTheme)}>
            <option value="light">light</option>
            <option value="dark">dark</option>
          </select>
        </label>

        <label>
          <span>Canvas</span>
          <select value={canvas} onChange={(event) => setCanvas(event.target.value as EmbedCanvas)}>
            <option value="solid">solid</option>
            <option value="transparent">transparent</option>
            <option value="notion">notion</option>
          </select>
        </label>

        <label className={`sample-checkbox${kind === "item" ? " is-disabled" : ""}`}>
          <span>게임 모드 목록</span>
          <input
            type="checkbox"
            checked={showList}
            disabled={kind === "item"}
            onChange={(event) => setShowList(event.target.checked)}
          />
          <strong>{kind === "item" ? "개별 모드에는 미적용" : showList ? "list=on" : "list=off"}</strong>
        </label>
      </section>

      <section className="sample-url" aria-label="생성된 임베드 URL">
        <input value={previewUrl} readOnly aria-label="생성된 URL" />
        <button type="button" onClick={copyUrl}>{copied ? "복사됨" : "URL 복사"}</button>
        <a href={previewUrl} target="_blank" rel="noreferrer">새 창에서 열기</a>
      </section>

      <p className="sample-note">
        <code>canvas=notion</code>은 브라우저의 <code>prefers-color-scheme</code>을 우선하며,
        감지할 수 없을 때 선택한 theme 값을 사용합니다.
      </p>

      <section className="sample-preview" aria-label="임베드 미리보기">
        <iframe
          key={previewUrl}
          src={previewUrl}
          title="Workshop 통계 임베드 미리보기"
          style={{ height: previewHeight }}
        />
      </section>
    </main>
  );
}
