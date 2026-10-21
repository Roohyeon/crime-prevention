import { useEffect, useState } from 'react';
import { useCrimeData, useRegionData } from './useCrimeData.js';
import { ALL } from './lib/aggregate.js';
import { BottomNav, TIME_YEARS, YEARS } from './components/ui.jsx';
import Home from './screens/Home.jsx';
import Ranking from './screens/Ranking.jsx';
import Places from './screens/Places.jsx';
import PlaceDetail from './screens/PlaceDetail.jsx';
import Regions from './screens/Regions.jsx';
import RegionDetail from './screens/RegionDetail.jsx';
import TimeScreen from './screens/TimeScreen.jsx';

// 화면 구조 (참고 이미지: 홈 대시보드 + 상세 정보 화면 + 하단 탭)
//  홈       : 가장 주의할 장소 / 지금 시간대 / 범죄 유형별 주의 장소 / TOP 5
//  장소 순위 : 범죄 유형 탭 → 장소 순위
//  지역     : 전국 → 시·도 → 시·군·구 (지역별 통계 CSV)
//  시간·요일 : 지금 시간대 + 시간대·요일 차트 (시간대 및 요일 API)
//  장소 찾기 : 검색·장소 종류 → 장소 목록
//  상세     : 장소/지역을 누르면 열림 (휴대폰 뒤로가기 지원)
export default function App() {
  const [year, setYear] = useState(YEARS[0]);
  const [tab, setTab] = useState('home');
  const [crime, setCrime] = useState({ large: ALL, medium: ALL });
  const [regionView, setRegionView] = useState({ large: ALL, sido: ALL });
  const [timeLarge, setTimeLarge] = useState(ALL);
  const [timeYear, setTimeYear] = useState(TIME_YEARS[0]);
  const [detail, setDetail] = useState(null); // { kind: 'place' | 'region', key }

  const { status, rows, message } = useCrimeData(year);
  const timeData = useCrimeData(timeYear, 'time');
  const regionData = useRegionData();

  // 상세 화면을 브라우저 히스토리에 올려서 휴대폰 "뒤로" 버튼으로 닫히게
  useEffect(() => {
    const onPop = (e) => setDetail(e.state?.detail ?? null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab, detail]);

  const openDetail = (kind) => (key) => {
    const next = { kind, key };
    window.history.pushState({ detail: next }, '');
    setDetail(next);
  };
  const closeDetail = () => window.history.back();

  const goTab = (t) => {
    if (detail) window.history.back();
    setTab(t);
  };

  const pickCrime = (large) => {
    setCrime({ large, medium: ALL });
    setTab('ranking');
  };

  const shared = { rows, status, year, setYear, onOpenPlace: openDetail('place') };
  // 장소 데이터 알림은 장소를 쓰는 화면에서만 (지역·시간 화면은 자체 표시)
  const usesPlace = detail ? detail.kind === 'place' : ['home', 'ranking', 'places'].includes(tab);

  let screen;
  if (detail?.kind === 'place') screen = <PlaceDetail {...shared} place={detail.key} onBack={closeDetail} />;
  else if (detail?.kind === 'region') screen = <RegionDetail data={regionData} regionKey={detail.key} onBack={closeDetail} />;
  else if (tab === 'home')
    screen = (
      <Home {...shared} timeData={timeData} onPickCrime={pickCrime}
        onSeeRanking={() => setTab('ranking')} onSeeTime={() => setTab('time')} />
    );
  else if (tab === 'ranking') screen = <Ranking {...shared} crime={crime} setCrime={setCrime} />;
  else if (tab === 'region')
    screen = <Regions data={regionData} view={regionView} setView={setRegionView} onOpenRegion={openDetail('region')} />;
  else if (tab === 'time') screen = (
      <TimeScreen data={timeData} year={timeYear} setYear={setTimeYear} large={timeLarge} setLarge={setTimeLarge} />
    );
  else screen = <Places {...shared} />;

  return (
    <div className="app">
      {usesPlace && status === 'demo' && (
        <div className="notice" role="status">
          <strong>예시 데이터</strong> 실제 통계가 아닌 무작위 값이에요. {message}
        </div>
      )}
      {usesPlace && status === 'error' && (
        <div className="notice error" role="alert">
          데이터를 불러오지 못했어요: {message}
        </div>
      )}
      {tab === 'time' && !detail && timeData.status === 'demo' && (
        <div className="notice" role="status">
          <strong>예시 데이터</strong> 시간대·요일 API를 연결하면 실제 통계로 바뀌어요.
        </div>
      )}

      <main>{screen}</main>

      <footer className="source">
        출처: 공공데이터포털 ·{' '}
        <a href="https://www.data.go.kr/data/3074463/fileData.do" target="_blank" rel="noreferrer">장소별</a>
        {' · '}
        <a href="https://www.data.go.kr/data/3074462/fileData.do" target="_blank" rel="noreferrer">지역별</a>
        {' · '}
        <a href="https://www.data.go.kr/data/3074459/fileData.do" target="_blank" rel="noreferrer">시간대 및 요일</a>
        {' '}(경찰청)
      </footer>

      <BottomNav tab={tab} setTab={goTab} />
    </div>
  );
}
