// 지역별 통계 가공. 컬럼 이름 예: "서울 종로구", "경기도 고양시", "세종시", "외국 미국"
import { CAT_L, CAT_M, sumColumns } from './aggregate.js';

// 칩 순서 (행정구역 관례 순서)
export const SIDO_ORDER = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

const SIDO_ALIAS = { 경기도: '경기', 강원도: '강원', 세종시: '세종' };

export function parseRegion(col) {
  const [head, ...rest] = col.trim().split(/\s+/);
  const sido = SIDO_ALIAS[head] ?? head;
  return { sido, district: rest.join(' ') || col.trim(), foreign: sido === '외국' };
}

/** region.json 의 압축 형식([대분류, 중분류, 숫자...])을 장소 데이터와 같은 행 객체로 */
export function toRows({ columns, rows }) {
  return rows.map(([large, medium, ...values]) => {
    const row = { [CAT_L]: large, [CAT_M]: medium };
    columns.forEach((c, i) => (row[c] = values[i]));
    return row;
  });
}

/**
 * 전국 시·군·구를 많은 순으로. 해외 발생 건수는 순위에서 빼고 foreign 으로 따로.
 * @returns {{ items: {key,sido,district,count,share}[], total:number, foreign:number }}
 */
export function rankDistricts(rows, crime) {
  let foreign = 0;
  const items = [];
  for (const [key, count] of sumColumns(rows, crime)) {
    const r = parseRegion(key);
    if (r.foreign) foreign += count;
    else items.push({ key, sido: r.sido, district: r.district, count });
  }
  const total = items.reduce((s, it) => s + it.count, 0);
  items.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, 'ko'));
  return { items: items.map((it) => ({ ...it, share: total ? it.count / total : 0 })), total, foreign };
}

/** 시·군·구 순위를 시·도 단위로 묶어서 많은 순으로 */
export function rankSido(districts, total) {
  const map = new Map();
  for (const d of districts) {
    const s = map.get(d.sido) ?? { sido: d.sido, count: 0, districts: 0 };
    s.count += d.count;
    s.districts += 1;
    map.set(d.sido, s);
  }
  return [...map.values()]
    .map((s) => ({ ...s, share: total ? s.count / total : 0 }))
    .sort((a, b) => b.count - a.count);
}
