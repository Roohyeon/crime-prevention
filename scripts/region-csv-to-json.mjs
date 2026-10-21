// 경찰청_범죄 발생 지역별 통계 CSV(CP949) → src/data/region.json 변환 스크립트
// 사용법: node scripts/region-csv-to-json.mjs "../경찰청_범죄 발생 지역별 통계_20251231.csv"
// 새 파일이 공개되면 이 명령만 다시 실행하면 됩니다. (파일명의 날짜가 기준일로 저장됨)
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

const file = process.argv[2];
if (!file) {
  console.error('CSV 파일 경로를 넣어주세요.');
  process.exit(1);
}

// 공공데이터포털 CSV는 대부분 CP949(EUC-KR). UTF-8 파일이면 그대로 읽음
const buf = readFileSync(file);
let text = new TextDecoder('utf-8', { fatal: false }).decode(buf);
if (text.includes('\uFFFD')) text = new TextDecoder('euc-kr').decode(buf);
text = text.replace(/^\uFEFF/, '');

// 따옴표가 들어간 칸도 처리하는 작은 CSV 파서
function parseLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const [header, ...lines] = text.split(/\r?\n/).filter((l) => l.trim()).map(parseLine);
const columns = header.slice(2);
// 용량을 줄이려고 [대분류, 중분류, 숫자...] 배열로 저장
const rows = lines.map(([large, medium, ...values]) => [large, medium, ...values.map((v) => Number(v.replaceAll(',', '')) || 0)]);

const date = basename(file).match(/(\d{4})(\d{2})(\d{2})/);
const out = {
  source: '경찰청_범죄 발생 지역별 통계',
  asOf: date ? `${date[1]}.${date[2]}.${date[3]}` : null,
  columns,
  rows,
};
writeFileSync(new URL('../src/data/region.json', import.meta.url), JSON.stringify(out));
console.log(`변환 완료: 지역 ${columns.length}개 × 범죄 ${rows.length}개 (기준 ${out.asOf})`);
