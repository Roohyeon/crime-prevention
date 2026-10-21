import { useMemo } from 'react';
import { rankPlaces, crimeTypeSummary, riskLevel } from '../lib/aggregate.js';
import { fmt, pct } from '../lib/format.js';
import { DAYS, rankOf, slotAt, slotLabel, timeProfile } from '../lib/time.js';
import { Icon, crimeIcon, YearSelect, RiskBadge } from '../components/ui.jsx';

// 홈: 열자마자 "가장 위험한 곳"과 "범죄 유형별 주의 장소"가 보이도록. 탭 없이도 답이 보이는 화면.
export default function Home({ rows, status, year, setYear, timeData, onOpenPlace, onPickCrime, onSeeRanking, onSeeTime }) {
  const { items } = useMemo(() => rankPlaces(rows), [rows]);
  const types = useMemo(() => crimeTypeSummary(rows).slice(0, 4), [rows]);
  const top = items[0];
  const loading = status === 'loading';

  // 지금 시간대가 하루 중 몇 번째로 범죄가 많은지 (시간·요일 데이터)
  const slots = useMemo(() => timeProfile(timeData.rows).slots, [timeData.rows]);
  const now = new Date();
  const nowSlot = slotAt(slots, now.getHours());
  const nowRank = nowSlot ? rankOf(slots, nowSlot.key) : -1;

  return (
    <>
      <header className="hero">
        <div className="hero-top">
          <YearSelect year={year} setYear={setYear} align="left" />
          <a className="call-112" href="tel:112" aria-label="112 신고 전화">
            <Icon name="phone" size={18} />
            112
          </a>
        </div>
        <p className="hello">{year}년 경찰청 통계 기준</p>
        <h1>가장 주의할 장소</h1>

        <button className="hero-card" onClick={() => top && onOpenPlace(top.place)} disabled={!top}>
          <Icon name="pin" />
          <span className="hero-card-text">
            <small>범죄가 가장 많이 일어난 곳</small>
            <strong>{loading ? '불러오는 중…' : top ? top.label : '데이터 없음'}</strong>
          </span>
          {top && (
            <span className="hero-card-num">
              {fmt(top.count)}건<small>{pct(top.share)}</small>
            </span>
          )}
        </button>
      </header>

      {nowSlot && (
        <section className="section">
          <button className="now-card" onClick={onSeeTime}>
            <span className="now-icon"><Icon name="clock" size={24} /></span>
            <span className="now-text">
              <small>
                지금 {DAYS[now.getDay()]}요일 {slotLabel(nowSlot)}
                {timeData.status === 'demo' && <span className="demo-tag">예시</span>}
              </small>
              <strong>하루 중 {nowRank + 1}번째로 많은 시간대</strong>
            </span>
            <RiskBadge level={riskLevel(nowRank, slots.length)} />
            <Icon name="chevron" size={18} />
          </button>
        </section>
      )}

      <section className="section" aria-labelledby="by-type">
        <h2 id="by-type">범죄 유형별 주의 장소</h2>
        <div className="menu-grid">
          {types.map((t) => (
            <button key={t.large} className="menu-card" onClick={() => onPickCrime(t.large)}>
              <span className="menu-icon"><Icon name={crimeIcon(t.large)} size={26} /></span>
              <strong>{t.large}</strong>
              <span className="menu-sub">
                {t.top ? <>가장 많은 곳<br /><b>{t.top.label}</b></> : '데이터 없음'}
              </span>
            </button>
          ))}
          {loading && types.length === 0 &&
            [0, 1, 2, 3].map((i) => <div key={i} className="menu-card skeleton" aria-hidden="true" />)}
        </div>
      </section>

      <section className="section" aria-labelledby="top5">
        <div className="section-head">
          <h2 id="top5">발생 많은 장소 TOP 5</h2>
          <button className="link-btn" onClick={onSeeRanking}>전체 보기</button>
        </div>
        <ul className="list-card">
          {items.slice(0, 5).map((it, i) => (
            <li key={it.place}>
              <button className="list-row" onClick={() => onOpenPlace(it.place)}>
                <span className="rank-num">{i + 1}</span>
                <span className="row-name">{it.label}</span>
                <RiskBadge level={riskLevel(i, items.length, it.count)} />
                <Icon name="chevron" size={18} />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
