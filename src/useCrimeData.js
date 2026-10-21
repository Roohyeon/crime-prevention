import { useEffect, useState } from 'react';
import { demoRows, demoTimeRows } from './lib/demo.js';
import { toRows } from './lib/region.js';

// 종류·연도별 응답을 메모리에 저장해두고 같은 걸 다시 고르면 네트워크 요청 없이 재사용
const cache = new Map();

/**
 * 우리 서버(/api/crime)에서 데이터를 가져오는 커스텀 훅.
 * 브라우저는 공공데이터 주소도, 키도 모릅니다. 오직 /api/crime 만 압니다.
 * @param {number|undefined} year  없으면 서버에 연결된 최신 연도
 * @param {'place'|'time'} type
 * status: 'loading' | 'ok' | 'demo' | 'error'
 */
export function useCrimeData(year, type = 'place') {
  const [state, setState] = useState({ status: 'loading', rows: [] });
  const cacheKey = `${type}:${year ?? 'latest'}`;

  useEffect(() => {
    if (cache.has(cacheKey)) {
      setState(cache.get(cacheKey));
      return;
    }
    // 연도를 빠르게 바꿀 때 이전 요청 결과가 늦게 도착해 덮어쓰는 문제 방지
    const controller = new AbortController();
    setState((s) => ({ ...s, status: 'loading' }));

    const qs = new URLSearchParams({ type });
    if (year) qs.set('year', year);

    fetch(`/api/crime?${qs}`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (res.ok) {
          const next = { status: 'ok', rows: body.rows, year: body.year, source: body.source };
          cache.set(cacheKey, next);
          setState(next);
        } else if (body.error === 'NO_KEY' || body.error === 'NOT_CONFIGURED') {
          // 키나 API 주소가 아직 없으면 화면 확인용 예시 데이터로 대체
          const rows = type === 'time' ? demoTimeRows() : demoRows(year);
          setState({ status: 'demo', rows, year, message: body.message });
        } else {
          setState({ status: 'error', rows: [], message: body.message ?? `오류 (${res.status})` });
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setState({ status: 'error', rows: [], message: '서버에 연결하지 못했습니다.' });
        }
      });

    return () => controller.abort();
  }, [cacheKey, type, year]);

  return state;
}

let regionCache = null;

/** 지역별 통계: 공개 CSV를 변환한 src/data/region.json 을 필요할 때만 불러옴 (scripts/region-csv-to-json.mjs) */
export function useRegionData() {
  const [state, setState] = useState(regionCache ?? { status: 'loading', rows: [] });

  useEffect(() => {
    if (regionCache) return;
    let alive = true;
    import('./data/region.json')
      .then(({ default: data }) => {
        regionCache = { status: 'ok', rows: toRows(data), asOf: data.asOf, source: data.source };
        if (alive) setState(regionCache);
      })
      .catch(() => alive && setState({ status: 'error', rows: [], message: '지역 데이터를 불러오지 못했습니다.' }));
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
