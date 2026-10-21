// Vercel 서버리스 함수: 배포하면 https://내도메인/api/crime 주소가 됩니다.
// (Vercel은 프로젝트 루트의 api/ 폴더 파일을 자동으로 서버 함수로 만듭니다)
import { getCrimeData } from './_lib/crimeApi.js';

export default async function handler(req, res) {
  const params = new URL(req.url, 'http://localhost').searchParams;
  // type: place(장소별, 기본) | time(시간대·요일)
  const type = params.get('type') ?? 'place';
  // 공공데이터포털 인증키는 계정당 하나라 보통 같은 키를 씀. 시간대용 키를 따로 받았다면 DATA_GO_KR_TIME_KEY 에
  const key = (type === 'time' && process.env.DATA_GO_KR_TIME_KEY) || process.env.DATA_GO_KR_KEY;
  const { status, body } = await getCrimeData(type, params.get('year'), key);

  // 통계는 1년에 한 번 바뀌므로 Vercel CDN에 하루 캐시 →
  // 방문자가 많아도 공공데이터 API 호출 횟수(일일 트래픽 제한)를 아낄 수 있음
  if (status === 200) {
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = status;
  res.end(JSON.stringify(body));
}
