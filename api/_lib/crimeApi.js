// ─────────────────────────────────────────────────────────────
// 서버 전용 코드 (브라우저로 절대 전달되지 않음)
//
// 왜 이 파일이 필요한가?
//  - React 코드(src/)는 빌드되면 누구나 브라우저 개발자도구에서 볼 수 있는 JS가 됩니다.
//  - 그래서 API 키를 React 안에 넣으면 "숨긴" 게 아니라 "공개"한 것이 됩니다.
//  - 이 파일은 Vercel 서버(또는 로컬 dev 서버)에서만 실행되고,
//    키는 서버의 환경변수(process.env)에서만 꺼내 씁니다.
//  - 브라우저는 우리 서버의 /api/crime 만 부르고, 공공데이터 서버는 우리 서버가 대신 부릅니다.
//    (이런 구조를 "프록시(중계) 서버" 또는 BFF라고 부릅니다)
// ─────────────────────────────────────────────────────────────

// 공공데이터포털 '경찰청_범죄 발생 장소별 통계' 연도별 데이터 주소
// 출처: https://infuser.odcloud.kr/oas/docs?namespace=3074463/v1 (2026-10-21 확인)
// 사용자가 보낸 값으로 URL을 직접 만들지 않고, 이 목록(화이트리스트)에서만 고르게 해서
// 엉뚱한 주소로 요청을 보내게 만드는 공격(SSRF)을 막습니다.
export const DATASETS = {
  2025: 'uddi:823ceb7c-4833-41ea-835f-dd8bd4c592d6',
  2024: 'uddi:6bb3e807-69f3-4d88-83f9-dd5febbf6bc6',
  2023: 'uddi:b375578d-d592-487f-bba7-e26eaededb13',
  2022: 'uddi:8147ae64-fb46-4b6c-9435-a0915ca1bd2c',
  2021: 'uddi:266a79ae-3afe-438c-92f0-a9606adda772',
  2020: 'uddi:79fe1448-cdc0-4abe-b933-a59afbd24553',
  2019: 'uddi:ee07ed79-e46e-4ebb-a7c0-f48a8517337f',
  2018: 'uddi:cbfa511d-490e-4132-9064-ce91185fced2',
};

// 공공데이터포털 '경찰청_범죄 발생 시간대 및 요일' (https://www.data.go.kr/data/3074459/fileData.do)
// 출처: https://infuser.odcloud.kr/oas/docs?namespace=3074459/v1 (2026-10-21 확인)
// 연도마다 시간 컬럼 이름이 다름 ('0시00분-02시59분' / '00:00-02:59') → src/lib/time.js 에서 둘 다 처리
// 2014년(범죄대분류 컬럼 없음), 2012년(시간대 컬럼 없음)은 화면 구조와 맞지 않아 제외
export const TIME_DATASETS = {
  2019: 'uddi:caf0f7cf-8b8b-4fff-a94d-8bb2a84d5b61',
  2018: 'uddi:13fb4720-9e04-448f-9411-cbc05c87fe20',
  2017: 'uddi:0cd7fef9-08a5-4d6d-ab31-dd72e1616b81_201909192134',
  2016: 'uddi:4dc8289f-2d18-48c6-8f5e-de752d9b639e_201909192131',
  2015: 'uddi:6477b03c-1b54-40d6-aba3-fd960960d3c0_201909192121',
  2013: 'uddi:48b87364-6990-456e-9e9d-fac872680b91_201910211512',
};

const SOURCES = {
  place: { base: 'https://api.odcloud.kr/api/3074463/v1/', datasets: DATASETS, name: '경찰청_범죄 발생 장소별 통계' },
  time: { base: 'https://api.odcloud.kr/api/3074459/v1/', datasets: TIME_DATASETS, name: '경찰청_범죄 발생 시간대 및 요일' },
};

export const YEARS = Object.keys(DATASETS).map(Number).sort((a, b) => b - a);

/**
 * 공공데이터 API를 호출해 { year, rows } 형태로 돌려줍니다.
 * @param {'place'|'time'} type       어떤 통계인지 (화이트리스트)
 * @param {string|number} yearParam  브라우저가 보낸 연도 (없으면 연결된 최신 연도)
 * @param {string|undefined} apiKey  서버 환경변수의 키
 * @returns {{status:number, body:object}}
 */
export async function getCrimeData(type, yearParam, apiKey, fetchImpl = fetch) {
  const src = Object.hasOwn(SOURCES, type) ? SOURCES[type] : null;
  if (!src) {
    return { status: 400, body: { error: 'BAD_TYPE', message: `지원 종류: ${Object.keys(SOURCES).join(', ')}` } };
  }
  const years = Object.keys(src.datasets).map(Number).sort((a, b) => b - a);
  if (years.length === 0) {
    return { status: 501, body: { error: 'NOT_CONFIGURED', message: `${src.name} API가 아직 연결되지 않았습니다.` } };
  }

  const year = Number(yearParam || years[0]);
  if (!src.datasets[year]) {
    return { status: 400, body: { error: 'BAD_YEAR', message: `지원 연도: ${years.join(', ')}` } };
  }
  if (!apiKey) {
    return {
      status: 503,
      body: { error: 'NO_KEY', message: '서버에 DATA_GO_KR_KEY 환경변수가 설정되지 않았습니다.' },
    };
  }

  // 행이 38개 정도라 한 번에 100개 요청이면 충분 (perPage 파라미터는 위 문서 기준)
  const url = new URL(src.base + src.datasets[year]);
  url.searchParams.set('page', '1');
  url.searchParams.set('perPage', '100');
  url.searchParams.set('returnType', 'JSON');
  // 공공데이터포털의 "Decoding" 키를 넣으면 URLSearchParams가 알아서 인코딩합니다.
  url.searchParams.set('serviceKey', apiKey);

  let res;
  try {
    res = await fetchImpl(url);
  } catch {
    return { status: 502, body: { error: 'UPSTREAM_UNREACHABLE', message: '공공데이터 서버에 연결하지 못했습니다.' } };
  }

  if (!res.ok) {
    // 주의: upstream 응답이나 URL을 그대로 돌려주면 키가 섞여 나갈 수 있어 상태코드만 전달
    return {
      status: 502,
      body: {
        error: 'UPSTREAM_ERROR',
        upstreamStatus: res.status,
        message:
          res.status === 401
            ? '인증키가 올바르지 않습니다. (Decoding 키인지, 활용신청 승인이 났는지 확인)'
            : '공공데이터 서버가 오류를 반환했습니다.',
      },
    };
  }

  const json = await res.json();
  return { status: 200, body: { type, year, source: `${src.name} (공공데이터포털)`, rows: (json.data ?? []).map(cleanRow) } };
}

// 연도에 따라 ' 폭력범죄', '지능범죄 ' 처럼 앞뒤 공백이 섞여 와서 같은 유형이 둘로 갈라지는 것 방지
function cleanRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.trim(), typeof v === 'string' ? v.trim() : v]),
  );
}

/** 장소별 통계 (기존 호출부·테스트 호환용) */
export const getCrimeByPlace = (yearParam, apiKey, fetchImpl) => getCrimeData('place', yearParam, apiKey, fetchImpl);
