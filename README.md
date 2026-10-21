# Crime Spots · 범죄예방 통계

경찰청 공공데이터(**범죄 발생 장소별 통계**)로 "어떤 장소에서 범죄가 얼마나 일어났는지" 순위를 보여주는 React 웹앱입니다.
API 키는 서버(Vercel 함수)에만 두고, 브라우저에는 절대 내려가지 않게 만들었습니다.

**배포 주소:** https://crime-prevention-one.vercel.app (`main`에 push하면 Vercel이 자동으로 다시 배포)

## 구조 한눈에 보기

```
브라우저(React)  ──  GET /api/crime?year=2025  ──▶  우리 서버(api/crime.js)
                                                     │  process.env.DATA_GO_KR_KEY 로 키 꺼냄
                                                     ▼
                                          api.odcloud.kr (공공데이터포털)
```

| 파일 | 역할 |
|---|---|
| `api/crime.js` | Vercel 서버 함수. 배포 후 `/api/crime` 주소가 됨 |
| `api/_lib/crimeApi.js` | 공공데이터 호출 로직 (연도 화이트리스트, 오류 처리, 키 미노출) |
| `vite.config.js` | 로컬에서도 `/api/crime`이 동작하게 하는 개발용 미들웨어 |
| `src/lib/aggregate.js` | 범죄유형/장소 필터 → 합산 → 정렬 (순수 함수) |
| `src/useCrimeData.js` | 데이터 요청 커스텀 훅 (캐시, 요청 취소, 키 없을 때 예시 데이터) |
| `src/App.jsx` | 앱 뼈대: 하단 탭(홈/장소 순위/지역/시간·요일/장소 찾기) + 장소·지역 상세 화면 전환 (뒤로가기 지원) |
| `src/screens/` | `Home` 가장 주의할 장소·지금 시간대·유형별 주의 장소·TOP 5 / `Ranking` 범죄 유형 탭별 순위 / `Regions`·`RegionDetail` 전국→시·도→시·군·구 / `TimeScreen` 시간대·요일 차트 / `Places` 장소 검색 / `PlaceDetail` 위험도·많이 일어난 범죄·예방 수칙 |
| `src/lib/region.js`, `src/lib/time.js` | 지역(시·도 이름 정리, 해외 분리)·시간대(컬럼 파싱, 미상 분리) 집계 |
| `src/data/region.json` | 지역별 통계 CSV를 변환한 파일 (`scripts/region-csv-to-json.mjs`) |
| `src/components/ui.jsx` | 아이콘, 연도 선택, 위험도 배지·스케일, 하단 탭 |
| `src/styles.css` | 디자인 토큰 (블루 톤 + 위험도 4단계 색) |
| `tests/` | 집계 로직 + "응답에 키가 섞이지 않는지" 테스트 |

## 1. 로컬 실행

```bash
npm install
cp .env.example .env.local     # Windows PowerShell: copy .env.example .env.local
# .env.local 을 열어 DATA_GO_KR_KEY= 뒤에 공공데이터포털 "일반 인증키(Decoding)" 붙여넣기
npm run dev                    # http://localhost:5173
npm test                       # 테스트
```

- 키가 없으면 **예시 데이터 모드**(무작위 값, 화면 상단에 표시)로 화면만 확인할 수 있습니다.
- 키 이름 앞에 `VITE_`를 붙이지 마세요. Vite는 `VITE_`로 시작하는 변수를 브라우저 코드에 그대로 넣습니다.
- 공공데이터포털 마이페이지에 키가 2개(Encoding/Decoding) 있으면 **Decoding** 키를 쓰세요. 코드가 알아서 인코딩합니다.

## 지역별 데이터 갱신

지역별 통계는 공공데이터포털에서 받은 CSV를 앱에 넣어서 씁니다. 새 파일이 공개되면:

```bash
node scripts/region-csv-to-json.mjs "../경찰청_범죄 발생 지역별 통계_YYYYMMDD.csv"
```

CP949/UTF-8 모두 읽고, 파일명의 날짜가 화면의 "공개 자료" 날짜로 들어갑니다.

## 시간대·요일 API

[경찰청_범죄 발생 시간대 및 요일](https://www.data.go.kr/data/3074459/fileData.do) 연도별 주소는 `api/_lib/crimeApi.js`의 `TIME_DATASETS`에 연결되어 있습니다 (2013, 2015~2019).

- 인증키는 `DATA_GO_KR_KEY`를 같이 씁니다 (공공데이터포털 일반 인증키는 계정당 하나). 활용신청만 승인되어 있으면 됩니다.
- 다른 계정의 키를 써야 하면 `.env.local`에 `DATA_GO_KR_TIME_KEY`를 추가하세요. Vercel에도 같은 이름으로 넣어야 합니다.
- 연도별로 시간 컬럼 이름이 다릅니다 (`0시00분-02시59분` / `00:00-02:59`). `src/lib/time.js`가 둘 다 읽습니다.
- 2014년(범죄대분류 없음), 2012년(시간대 없음)은 제외했습니다. 2018년 자료는 범죄 유형이 27개뿐입니다(원본 그대로).

## 2. 배포 (Vercel)

1. 이 폴더를 GitHub 저장소에 올립니다. (`.env.local`은 `.gitignore`에 있어서 올라가지 않음 — `git status`로 한 번 확인)
2. vercel.com → Add New Project → 저장소 선택 (Framework: Vite 자동 인식)
3. **Settings → Environment Variables** 에 `DATA_GO_KR_KEY` = 내 키 추가 → Deploy
4. 배포 후 `https://내주소/api/crime?year=2025` 를 열어 JSON이 나오면 성공

키를 바꾸면 Vercel에서 환경변수 수정 후 **Redeploy** 해야 반영됩니다.

## 확인 방법: 키가 정말 숨겨졌나?

- 배포된 사이트에서 개발자도구(F12) → Network 탭: 요청 주소가 `/api/crime` 뿐이고 `serviceKey`가 보이지 않아야 함
- `npm run build` 후 `dist/` 폴더에서 키 문자열 검색 → 없어야 함

## 데이터 출처

- [공공데이터포털 · 경찰청_범죄 발생 장소별 통계](https://www.data.go.kr/data/3074463/fileData.do) (단위: 건, 연간 갱신)
- [공공데이터포털 · 경찰청_범죄 발생 지역별 통계](https://www.data.go.kr/data/3074462/fileData.do) (2025.12.31 파일, 해외 발생 건수는 순위에서 제외)
- [공공데이터포털 · 경찰청_범죄 발생 시간대 및 요일](https://www.data.go.kr/data/3074459/fileData.do) (시간 미상은 시간대 비율에서 제외)
- 연도별 API 주소: [odcloud API 문서](https://infuser.odcloud.kr/oas/docs?namespace=3074463/v1) — 2018~2025년 연결
- 장소 그룹(주거/도로/교통…) 묶음은 이 앱에서 임의로 정한 분류입니다. 경찰청 공식 분류가 아닙니다.
- 위험도(낮음/보통/높음/매우 높음)는 발생 건수 순위 기준 상대 등급(상위 10%/30%/60%)입니다. 이용 인구는 반영되지 않습니다.
- 장소 상세의 예방 수칙은 일반적인 생활 안전 안내이며 통계에서 나온 값이 아닙니다.
