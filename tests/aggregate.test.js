import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankPlaces, groupOf, toNumber, categoryTree, ALL } from '../src/lib/aggregate.js';
import { getCrimeByPlace } from '../api/_lib/crimeApi.js';

const rows = [
  { 범죄대분류: '강력범죄', 범죄중분류: '살인', 아파트: 3, 편의점: '1,000', 일반도로: 5 },
  { 범죄대분류: '강력범죄', 범죄중분류: '강도', 아파트: 7, 편의점: 0, 일반도로: 5 },
  { 범죄대분류: '절도범죄', 범죄중분류: '절도', 아파트: 10, 편의점: 2, 일반도로: null },
];

test('전체 합산 후 많은 순 정렬', () => {
  const { items, total } = rankPlaces(rows);
  assert.deepEqual(items.map((i) => [i.place, i.count]), [['편의점', 1002], ['아파트', 20], ['일반도로', 10]]);
  assert.equal(total, 1032);
});

test('범죄 대분류/중분류 필터', () => {
  assert.equal(rankPlaces(rows, { large: '강력범죄' }).total, 1020);
  assert.equal(rankPlaces(rows, { large: '강력범죄', medium: '강도' }).items[0].place, '아파트');
});

test('장소 그룹 필터와 비율', () => {
  const { items } = rankPlaces(rows, { group: 'home' });
  assert.equal(items.length, 1);
  assert.equal(items[0].share, 1);
});

test('장소 그룹 판별: "자동차 전용도로"는 교통이 아니라 도로', () => {
  assert.equal(groupOf('자동차 전용도로'), 'road');
  assert.equal(groupOf('지하철역_전철역'), 'transit');
  assert.equal(groupOf('미상'), 'etc');
});

test('숫자 변환', () => {
  assert.equal(toNumber('1,234'), 1234);
  assert.equal(toNumber('-'), 0);
  assert.equal(toNumber(undefined), 0);
});

test('카테고리 트리', () => {
  assert.deepEqual(categoryTree(rows).get('강력범죄'), ['살인', '강도']);
  assert.equal(ALL, '__ALL__');
});

test('서버: 키 없으면 503, 이상한 연도면 400', async () => {
  assert.equal((await getCrimeByPlace('2025', undefined)).status, 503);
  assert.equal((await getCrimeByPlace('1999', 'k')).status, 400);
  assert.equal((await getCrimeByPlace('../../evil', 'k')).status, 400);
});

test('서버: 키는 요청 URL에만 쓰이고 응답에는 절대 안 나감', async () => {
  const SECRET = 'MY_SECRET_KEY+/=';
  let calledUrl;
  const fakeFetch = async (url) => {
    calledUrl = String(url);
    return { ok: true, json: async () => ({ data: rows }) };
  };
  const ok = await getCrimeByPlace('2024', SECRET, fakeFetch);
  assert.equal(ok.status, 200);
  assert.match(calledUrl, /uddi:6bb3e807/);
  assert.ok(calledUrl.includes(encodeURIComponent(SECRET)), '키가 URL 인코딩되어 전달');
  assert.ok(!JSON.stringify(ok.body).includes('SECRET'));

  const bad = await getCrimeByPlace('2024', SECRET, async () => ({ ok: false, status: 401 }));
  assert.equal(bad.status, 502);
  assert.ok(!JSON.stringify(bad.body).includes('SECRET'));
});

test('위험도: 상위 10% / 30% / 60% / 나머지, 0건은 낮음', async () => {
  const { riskLevel } = await import('../src/lib/aggregate.js');
  assert.deepEqual([0, 1, 2, 3, 5, 6, 9].map((i) => riskLevel(i, 10)), [3, 2, 2, 1, 1, 0, 0]);
  assert.equal(riskLevel(0, 10, 0), 0);
  assert.equal(riskLevel(-1, 10), 0);
});

test('범죄 유형 요약: 많은 순, 유형별 최다 장소', async () => {
  const { crimeTypeSummary } = await import('../src/lib/aggregate.js');
  const s = crimeTypeSummary(rows);
  assert.deepEqual(s.map((t) => [t.large, t.total, t.top.place]), [['강력범죄', 1020, '편의점'], ['절도범죄', 12, '아파트']]);
});

test('장소 프로필: 그 장소의 범죄를 많은 순으로, 0건 제외', async () => {
  const { placeProfile } = await import('../src/lib/aggregate.js');
  const p = placeProfile(rows, '편의점');
  assert.equal(p.total, 1002);
  assert.deepEqual(p.crimes.map((c) => c.medium), ['살인', '절도']);
});

test('기타·미상은 순위에서 빼고 따로 집계 (기타상점은 유지)', () => {
  const r = [{ 범죄대분류: '절도범죄', 범죄중분류: '절도', 기타: 50, 미상: 20, 기타상점: 5, 편의점: 10 }];
  const { items, total, unspecified } = rankPlaces(r);
  assert.deepEqual(items.map((i) => i.place), ['편의점', '기타상점']);
  assert.equal(total, 15);
  assert.equal(unspecified, 70);
});

test('지역: 시·도 이름 정리, 해외 제외, 시·도 합계', async () => {
  const { parseRegion, rankDistricts, rankSido } = await import('../src/lib/region.js');
  assert.deepEqual(parseRegion('경기도 고양시'), { sido: '경기', district: '고양시', foreign: false });
  assert.deepEqual(parseRegion('세종시'), { sido: '세종', district: '세종시', foreign: false });
  assert.equal(parseRegion('외국 미국').foreign, true);

  const r = [{ 범죄대분류: '절도범죄', 범죄중분류: '절도', '서울 종로구': 5, '서울 중구': 10, '경기도 고양시': 7, '외국 미국': 3 }];
  const { items, total, foreign } = rankDistricts(r);
  assert.deepEqual(items.map((i) => i.key), ['서울 중구', '경기도 고양시', '서울 종로구']);
  assert.equal(total, 22);
  assert.equal(foreign, 3);
  assert.deepEqual(rankSido(items, total).map((s) => [s.sido, s.count, s.districts]), [['서울', 15, 2], ['경기', 7, 1]]);
});

test('시간대·요일: 실제 컬럼 형식 파싱, 미상 분리', async () => {
  const { parseSlot, timeProfile, slotAt, rankOf } = await import('../src/lib/time.js');
  assert.deepEqual(parseSlot('0시00분-02시59분'), { start: 0, end: 2 });
  assert.deepEqual(parseSlot('21시00분-23시59분'), { start: 21, end: 23 });
  assert.equal(parseSlot('미상'), null);

  const r = [{ 범죄대분류: '절도범죄', 범죄중분류: '절도', '21시00분-23시59분': 30, '0시00분-02시59분': 10, 미상: 5, 일: 4, 금: 9 }];
  const p = timeProfile(r);
  assert.deepEqual(p.slots.map((s) => s.start), [0, 21]);
  assert.equal(p.slotTotal, 40);
  assert.equal(p.unknown, 5);
  assert.equal(p.days.find((d) => d.key === '금').count, 9);
  assert.equal(slotAt(p.slots, 22).start, 21);
  assert.equal(rankOf(p.slots, '21시00분-23시59분'), 0);
});

test('서버: 시간대 연도 화이트리스트, 이상한 종류는 400', async () => {
  const { getCrimeData } = await import('../api/_lib/crimeApi.js');
  assert.equal((await getCrimeData('time', '2014', 'k')).status, 400);
  assert.equal((await getCrimeData('time', '2019', undefined)).status, 503);
  assert.equal((await getCrimeData('__proto__', '2025', 'k')).status, 400);
  assert.equal((await getCrimeData('../evil', '2025', 'k')).status, 400);
});

test('시간대: 2013~2018 형식(00:00-02:59)도 파싱', async () => {
  const { parseSlot } = await import('../src/lib/time.js');
  assert.deepEqual(parseSlot('00:00-02:59'), { start: 0, end: 2 });
  assert.deepEqual(parseSlot('21:00-23:59'), { start: 21, end: 23 });
  assert.deepEqual(parseSlot('00:00~2:59:'), { start: 0, end: 2 });
});
