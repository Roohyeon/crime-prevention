// 인증키가 아직 없을 때 화면만 확인하기 위한 "가짜" 데이터.
// ⚠️ 숫자는 실제 통계가 아니라 무작위로 만든 값입니다. 화면에도 그렇게 표시합니다.

const PLACES = [
  '단독주택_다가구_다중', '아파트', '다세대_연립', '오피스텔_원룸', '일반도로', '통행로_보도_골목길',
  '편의점', '슈퍼마켓_소매점', '시장_노점', '무인상점', '음식점', '카페', '주점',
  '숙박업소_호텔_모텔_여관', '지하철역_전철역', '버스', '택시', '자가용자동차', '공원_놀이시설',
  '게임장_피씨방', '학교', '학원', '의료기관', '관공서', '야외_산야', '공중화장실', '기타', '미상',
];
const CATS = [
  ['강력범죄', ['살인', '강도', '방화', '성폭력']],
  ['절도범죄', ['절도']],
  ['폭력범죄', ['상해', '폭행', '협박']],
  ['지능범죄', ['사기', '횡령']],
];

// 매번 같은 결과가 나오도록 시드 기반 난수 사용
function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

export function demoRows(year = 2025) {
  const rnd = seeded(year);
  return CATS.flatMap(([large, mediums]) =>
    mediums.map((medium) => {
      const row = { 범죄대분류: large, 범죄중분류: medium };
      PLACES.forEach((p, i) => (row[p] = Math.round(rnd() ** 2 * 3000 / (1 + i * 0.15))));
      return row;
    }),
  );
}

// 시간대·요일 API를 연결하기 전 화면 확인용. 컬럼 이름은 실제 데이터셋(3074459)과 같게 맞춤
const TIME_COLS = ['0시00분-02시59분', '03시00분-05시59분', '06시00분-08시59분', '09시00분-11시59분',
  '12시00분-14시59분', '15시00분-17시59분', '18시00분-20시59분', '21시00분-23시59분'];
const TIME_WEIGHT = [1.1, 0.6, 0.6, 1, 1.2, 1.2, 1.4, 1.5]; // 화면이 그럴듯해 보이도록 둔 가중치 (실제 값 아님)
const DAY_COLS = ['일', '월', '화', '수', '목', '금', '토'];

export function demoTimeRows(seed = 7) {
  const rnd = seeded(seed);
  return CATS.flatMap(([large, mediums]) =>
    mediums.map((medium) => {
      const row = { 범죄대분류: large, 범죄중분류: medium };
      const base = 400 + rnd() * 3000;
      TIME_COLS.forEach((c, i) => (row[c] = Math.round(base * TIME_WEIGHT[i] * (0.8 + rnd() * 0.4))));
      row['미상'] = Math.round(base * 0.3 * rnd());
      const sum = TIME_COLS.reduce((s, c) => s + row[c], 0) + row['미상'];
      DAY_COLS.forEach((d) => (row[d] = Math.round((sum / 7) * (0.85 + rnd() * 0.3))));
      return row;
    }),
  );
}
