# Steam Workshop 통계 대시보드

`myplmy`의 공개 Steam Workshop 아이템을 한 화면에서 비교하는 정적 React 대시보드입니다. GitHub Pages가 화면을 호스팅하고 Vercel Function이 서버 전용 Steam Web API 키를 사용합니다.

## 구성

- `web/`: React + TypeScript + Vite 정적 프런트엔드
- `api/workshop.ts`: 고정 Steam 프로필만 제공하는 Vercel Function
- `src/server/`: Steam API, 공개 Workshop HTML 폴백, 정규화 로직
- `scripts/steam-contract.ts`: 실제 키로 비공식 Steam API 계약을 검증하는 배포 전 검사

## 로컬 실행

Node.js 20 이상이 필요합니다.

```powershell
npm install
Copy-Item .env.example .env
# .env의 STEAM_WEB_API_KEY를 설정
npx vercel dev
```

다른 터미널에서 프런트엔드를 실행합니다.

```powershell
npm run dev:web
```

Vite는 `/api` 요청을 `http://localhost:3000`의 Vercel 개발 서버로 전달합니다.

## 검증

```powershell
npm test
npm run typecheck
npm run build
npm run smoke:public
npm run contract:steam
```

`smoke:public`은 키 없이 공개 Workshop HTML 탐색과 대표 아이템 3개의 공개 상세 통계를 검사합니다.

`contract:steam`은 다음을 실제 Steam 응답으로 검사합니다.

- AppID를 생략한 `GetUserFiles`가 RimWorld(294100)와 Victoria 3(529340)를 모두 반환하는지
- 대표 아이템 3개의 `votes_up`, `votes_down`, `score`가 반환되는지

API 키는 출력하지 않습니다. 이 검사가 실패하면 배포하지 말고 Steam API 계약을 다시 확인해야 합니다.

## Vercel 배포

1. 저장소를 Vercel 프로젝트에 연결합니다.
2. Production과 필요한 Preview 환경에 다음 환경 변수를 설정합니다.
   - `STEAM_WEB_API_KEY`: Steam Web API 키
   - `GITHUB_PAGES_ORIGIN`: 예: `https://myplmy.github.io` 또는 사용자 사이트의 정확한 origin
   - `STEAM_ID`: 기본값 `76561197991373987`
   - `STEAM_VANITY`: 기본값 `myplmy`
3. 배포 후 `https://<project>.vercel.app/api/workshop`을 확인합니다.

API는 쿼리 파라미터를 거부하므로 1차 버전에서는 다른 Steam 사용자를 조회할 수 없습니다. CORS는 GitHub Pages origin과 localhost만 허용하며, 응답은 Vercel CDN에서 15분 캐시됩니다.

## GitHub Pages 배포

1. 저장소 Settings → Pages에서 Source를 **GitHub Actions**로 설정합니다.
2. Settings → Secrets and variables → Actions → Variables에 `VITE_API_BASE_URL`을 생성합니다.
   - 값: `https://<project>.vercel.app/api`
3. `main`에 push하면 테스트 후 `web/dist`가 배포됩니다.

저장소 이름에 따른 GitHub Pages 하위 경로는 빌드 시 자동 적용됩니다. Steam API 키는 GitHub 변수나 프런트엔드 빌드에 넣지 않습니다.

## Notion 임베드 위젯

Notion 페이지에서 `/embed` 블록을 만든 뒤 아래와 같은 GitHub Pages URL을 붙여 넣습니다. 서버 API는 전체 대시보드와 동일하며, 위젯이 응답에서 지정한 게임 또는 Workshop 항목만 선택합니다.

게임 요약 예시:

```text
https://myplmy.github.io/SWItemStat/?embed=game&app=529340&density=standard&theme=light&list=on
https://myplmy.github.io/SWItemStat/?embed=game&app=294100&density=standard&theme=light
```

개별 모드 예시:

```text
https://myplmy.github.io/SWItemStat/?embed=item&id=3598011620&density=standard&theme=light
https://myplmy.github.io/SWItemStat/?embed=item&id=3547456198&density=full&theme=dark
https://myplmy.github.io/SWItemStat/?embed=item&id=3547456198&density=notion&theme=dark&canvas=notion
```

지원하는 URL 파라미터:

- `embed`: `game` 또는 `item`
- `app`: 게임 위젯에서 사용할 Steam AppID
- `id`: 개별 위젯에서 사용할 Workshop ID
- `density`: `compact`, `standard`, `full`, `notion` (기본값 `standard`)
- `theme`: `light`, `dark` (기본값 `light`)
- `canvas`: 일반 배경은 `solid`, 투명 배경을 시도하려면 `transparent`, Notion 표면색과 맞추려면 `notion` (기본값 `solid`)
- `list`: 게임 위젯의 모드별 1행 통계 목록을 표시하려면 `on`, 숨기려면 `off` (기본값 `off`)

`density=notion`은 방문자, 구독수(현재/누적), 즐겨찾기(현재/누적), 긍정/전체 평가, 구독률을 정확히 5열로 표시합니다. 구독률은 현재 구독 수를 방문자 수로 나눈 값입니다. Native Notion에서는 `canvas=notion`을 권장하며 감지된 dark 모드는 `#191919`, light 모드는 `#ffffff`로 카드 바깥을 채웁니다. `canvas=transparent`는 가능한 범위에서 `html`, `body`, `#root`를 모두 투명하게 만들지만, Notion의 iframe 표면 자체가 불투명하면 실제 투명 합성이 제한될 수 있습니다.

`canvas=notion`은 `prefers-color-scheme`으로 현재 Notion/브라우저 색상 모드를 먼저 감지하고, 감지 API를 사용할 수 없거나 예외가 발생하면 URL의 `theme` 값을 fallback으로 사용합니다. 실제 배포 환경에서 모든 조합을 확인하려면 [임베드 위젯 샘플](https://myplmy.github.io/SWItemStat/?view=embed-samples)을 사용합니다.

`list=on`은 모드명과 선택한 `density`에 맞는 개별 통계를 한 모드당 한 줄로 표시합니다. `density=notion` 목록은 가로 스크롤 없이 블록 너비에 맞춰지고, 항목이 10개 이상이면 헤더를 고정한 채 목록에 세로 스크롤을 표시합니다. 목록 없는 부모 페이지에는 Victoria 3와 RimWorld 게임 요약을 2열로 배치하고, 목록을 표시할 때는 충분한 너비의 1열 블록을 권장합니다. Notion 블록 높이는 `compact` 240~300px, `standard` 360~440px, `full` 560~700px을 기준으로 합니다.

## 데이터 동작

1. 키 기반 `IPublishedFileService/GetUserFiles`로 전체 게임의 아이템 ID를 탐색합니다.
2. 실패하면 공개 `myworkshopfiles` 페이지를 순회해 아이템 ID와 AppID를 수집합니다.
3. 공개 상세 API에서 방문·구독·즐겨찾기 통계를, 키 기반 상세 API에서 투표 통계를 병합합니다.
4. 제작자가 일치하고 `visibility=0`인 공개 아이템만 응답합니다.

Steam의 `myworkshopfiles` 목록에는 공동 작업자로 참여한 다른 제작자의 항목이 표시될 수 있습니다. 1차 버전은 계획대로 공개 상세 응답의 `creator`가 `STEAM_ID`와 일치하는 직접 소유 항목만 대시보드에 포함합니다.

서버리스 인메모리 속도 제한은 인스턴스 단위의 보조 장치입니다. 임의 사용자 검색을 추가하는 2차 버전에서는 Upstash 같은 외부 저장소 기반 분산 속도 제한을 사용해야 합니다.
