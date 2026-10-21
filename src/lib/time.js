// 시간대·요일 통계 가공.
// 공공데이터포털 '경찰청_범죄 발생 시간대 및 요일' 컬럼:
//   0시00분-02시59분 … 21시00분-23시59분 (3시간 단위 8개), 미상, 일 월 화 수 목 금 토
import { sumColumns } from './aggregate.js';

export const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 연도별 컬럼 형식: '0시00분-02시59분'(2019) / '00:00-02:59'(2013~2018)
const TIME_RES = [/^(\d{1,2})시(\d{1,2})분[-~](\d{1,2})시(\d{1,2})분$/, /^(\d{1,2}):(\d{2})[-~](\d{1,2}):(\d{2}):?$/];
const pad = (n) => String(n).padStart(2, '0');

/** "21시00분-23시59분" 또는 "21:00-23:59" → { start: 21, end: 23 } (형식이 다르면 null) */
export function parseSlot(col) {
  const s = col.replace(/\s/g, '');
  const m = TIME_RES.map((re) => s.match(re)).find(Boolean);
  return m ? { start: Number(m[1]), end: Number(m[3]) } : null;
}

export const slotLabel = (s) => `${pad(s.start)}:00~${pad(s.end)}:59`;

/**
 * 범죄 유형 필터 기준 시간대별/요일별 건수.
 * 시간 '미상'은 시간대 비율 계산에서 빼고 unknown 으로 따로 돌려줌.
 */
export function timeProfile(rows, crime) {
  const slots = [];
  const days = DAYS.map((d) => ({ key: d, label: d, count: 0 }));
  let unknown = 0;

  for (const [col, count] of sumColumns(rows, crime)) {
    const slot = parseSlot(col);
    const day = DAYS.indexOf(col.trim().replace(/요일$/, ''));
    if (slot) slots.push({ key: col, ...slot, label: `${slot.start}시`, count });
    else if (day >= 0) days[day].count += count;
    else unknown += count;
  }
  slots.sort((a, b) => a.start - b.start);

  const withShare = (list) => {
    const total = list.reduce((s, it) => s + it.count, 0);
    return { list: list.map((it) => ({ ...it, share: total ? it.count / total : 0 })), total };
  };
  const t = withShare(slots);
  const d = withShare(days);
  return { slots: t.list, slotTotal: t.total, days: d.list, dayTotal: d.total, unknown };
}

/** 지금 시각이 속한 시간대 */
export const slotAt = (slots, hour) => slots.find((s) => hour >= s.start && hour <= s.end) ?? null;

/** 많은 순 순위 (0부터) */
export const rankOf = (list, key) =>
  [...list].sort((a, b) => b.count - a.count).findIndex((it) => it.key === key);
