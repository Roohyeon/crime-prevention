// 화면에 보여주기 좋은 형태로 데이터를 가공하는 "순수 함수" 모음.
// 순수 함수 = 같은 입력이면 항상 같은 결과, 화면/네트워크와 무관 → 테스트하기 쉬움.

export const CAT_L = '범죄대분류';
export const CAT_M = '범죄중분류';
export const ALL = '__ALL__';

// 장소 이름(컬럼명)을 비슷한 성격끼리 묶는 규칙. 위에서부터 먼저 맞는 그룹에 들어감.
// 연도마다 컬럼명이 조금씩 달라도 동작하도록 "정확한 이름" 대신 "포함된 단어"로 판별.
// tips: 상세 화면에 보여줄 일반적인 생활 안전 수칙 (통계에서 나온 값이 아님)
export const PLACE_GROUPS = [
  { id: 'home', label: '주거', keys: ['주택', '아파트', '다세대', '오피스텔', '거주'],
    tips: ['외출·취침 전 현관과 창문 잠금 확인', '택배·방문자는 문 열기 전에 신원 확인'] },
  { id: 'road', label: '도로', keys: ['도로', '통행로', '골목'],
    tips: ['밤에는 밝고 사람이 많은 길로 이동', '이어폰 볼륨을 낮춰 주변 소리 듣기'] },
  { id: 'transit', label: '교통', keys: ['터미널', '역', '공항', '버스', '택시', '자동차', '지하철', '기차', '선박', '비행기', '교통'],
    tips: ['혼잡할 때는 가방을 몸 앞쪽으로', '택시 탑승 시 차량 번호를 지인에게 공유'] },
  { id: 'shop', label: '상점', keys: ['백화점', '할인점', '슈퍼', '편의점', '시장', '창고', '상점'],
    tips: ['결제 후 카드·지갑을 바로 챙기기', '자리를 비울 때 소지품을 두고 가지 않기'] },
  { id: 'night', label: '숙박·음식·유흥', keys: ['숙박', '목욕', '이발', '마사지', '위생', '음식점', '카페', '주점', '유흥'],
    tips: ['자리를 비운 사이의 음료는 마시지 않기', '늦은 귀가는 동선을 미리 지인과 공유'] },
  { id: 'leisure', label: '여가', keys: ['공연', '체육', '공원', '게임', '유원지'],
    tips: ['소지품을 의자·벤치에 두고 자리 비우지 않기', '늦은 시간 인적이 드문 구역은 피하기'] },
  { id: 'public', label: '교육·공공', keys: ['어린이집', '학교', '도서관', '학원', '교육', '금융', '의료', '종교', '관공서', '군사', '구금', '복지'],
    tips: ['개인정보가 적힌 서류는 바로 회수', '기관 직원을 사칭한 송금 요구는 끊고 확인'] },
  { id: 'etc', label: '야외·기타', keys: [],
    tips: ['인적이 드문 곳은 혼자 가지 않기', '위급하면 112, 문자 신고도 112'] },
];

export function groupOf(place) {
  const g = PLACE_GROUPS.find((grp) => grp.keys.some((k) => place.includes(k)));
  return g ? g.id : 'etc';
}

// "단독주택_다가구_다중" → "단독주택·다가구·다중"
export const prettyPlace = (name) => name.replaceAll('_', '·');

// API 값이 숫자 또는 "1,234" 같은 문자열로 올 수 있어 안전하게 숫자로 변환
export function toNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = Number(String(v ?? '').replaceAll(',', '').trim());
  return Number.isFinite(n) ? n : 0;
}

/** 대분류 → 중분류 목록 */
export function categoryTree(rows) {
  const tree = new Map();
  for (const r of rows) {
    const l = r[CAT_L];
    if (!tree.has(l)) tree.set(l, []);
    if (r[CAT_M] && !tree.get(l).includes(r[CAT_M])) tree.get(l).push(r[CAT_M]);
  }
  return tree;
}

/**
 * 범죄 유형 필터에 맞는 행만 골라 컬럼(장소·지역·시간대…)별 합계를 냄.
 * 장소/지역/시간대 통계가 모두 "행=범죄 유형, 열=집계 기준" 구조라 공통으로 씀.
 */
export function sumColumns(rows, { large = ALL, medium = ALL } = {}) {
  const sums = new Map();
  for (const r of rows) {
    if (large !== ALL && r[CAT_L] !== large) continue;
    if (medium !== ALL && r[CAT_M] !== medium) continue;
    for (const [key, value] of Object.entries(r)) {
      if (key === CAT_L || key === CAT_M) continue;
      sums.set(key, (sums.get(key) ?? 0) + toNumber(value));
    }
  }
  return sums;
}

/** 범죄 대분류를 전체 건수 많은 순으로 (유형 탭 순서용) */
export function crimeTypes(rows) {
  return [...categoryTree(rows).keys()]
    .map((large) => [large, [...sumColumns(rows, { large }).values()].reduce((s, n) => s + n, 0)])
    .sort((a, b) => b[1] - a[1])
    .map(([large]) => large);
}

// 실제 데이터에서 '기타'·'미상'이 상위권에 오는데, 어디를 조심하라는 정보가 없어서 순위에서 뺌.
// ('기타상점', '교통수단내_기타'처럼 장소가 드러나는 이름은 그대로 둠)
export const isUnspecified = (place) => place === '기타' || place === '미상';

/**
 * 선택한 범죄 유형/장소 그룹 기준으로 장소별 건수를 합산하고 많은 순으로 정렬.
 * 장소가 특정되지 않은 건수(기타·미상)는 items/total 에서 빼고 unspecified 로 따로 돌려줌.
 * @returns {{ items: {place,label,group,count,share}[], total:number, unspecified:number }}
 */
export function rankPlaces(rows, { large = ALL, medium = ALL, group = ALL } = {}) {
  const sums = sumColumns(rows, { large, medium });

  let items = [...sums].map(([place, count]) => ({
    place,
    label: prettyPlace(place),
    group: groupOf(place),
    count,
  }));
  if (group !== ALL) items = items.filter((it) => it.group === group);

  const unspecified = items.filter((it) => isUnspecified(it.place)).reduce((s, it) => s + it.count, 0);
  items = items.filter((it) => !isUnspecified(it.place));
  const total = items.reduce((s, it) => s + it.count, 0);
  items.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ko'));
  return { items: items.map((it) => ({ ...it, share: total ? it.count / total : 0 })), total, unspecified };
}


// 위험도 4단계. 장소별 "발생 건수 순위"를 기준으로 한 상대 등급 (이용 인구는 반영되지 않음)
export const RISK_LEVELS = [
  { id: 'low', label: '낮음' },
  { id: 'mid', label: '보통' },
  { id: 'high', label: '높음' },
  { id: 'top', label: '매우 높음' },
];

/** 정렬된 순위(index, 0부터)로 위험 단계(0~3) 계산: 상위 10% / 30% / 60% / 나머지 */
export function riskLevel(index, length, count = 1) {
  if (!count || !length || index < 0) return 0;
  const p = index / length;
  return p < 0.1 ? 3 : p < 0.3 ? 2 : p < 0.6 ? 1 : 0;
}

/** 범죄 대분류별 합계와, 그 범죄가 가장 많이 일어난 장소 (홈 카드용, 많은 순) */
export function crimeTypeSummary(rows) {
  return [...categoryTree(rows).keys()]
    .map((large) => {
      const { items, total } = rankPlaces(rows, { large });
      return { large, total, top: items[0]?.count ? items[0] : null };
    })
    .sort((a, b) => b.total - a.total);
}

/** 한 장소에서 일어난 범죄(중분류)를 많은 순으로 */
export function placeProfile(rows, place) {
  const crimes = rows
    .map((r) => ({ large: r[CAT_L], medium: r[CAT_M] || r[CAT_L], count: toNumber(r[place]) }))
    .filter((c) => c.count > 0);
  const total = crimes.reduce((s, c) => s + c.count, 0);
  crimes.sort((a, b) => b.count - a.count);
  return { crimes: crimes.map((c) => ({ ...c, share: total ? c.count / total : 0 })), total };
}
