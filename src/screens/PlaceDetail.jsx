import { useMemo } from 'react';
import { PLACE_GROUPS, prettyPlace, placeProfile, rankPlaces, riskLevel, RISK_LEVELS } from '../lib/aggregate.js';
import { fmt, pct } from '../lib/format.js';
import { Icon, RiskScale, SubHeader } from '../components/ui.jsx';

// 장소 상세: 위험도 → 많이 일어난 범죄 → 예방 수칙 순서로, 스크롤 한 번 안에 끝나도록.
export default function PlaceDetail({ rows, year, place, onBack }) {
  const { items } = useMemo(() => rankPlaces(rows), [rows]);
  const profile = useMemo(() => placeProfile(rows, place), [rows, place]);

  const index = items.findIndex((it) => it.place === place);
  const item = items[index];
  const level = riskLevel(index, items.length, item?.count);
  const group = PLACE_GROUPS.find((g) => g.id === item?.group) ?? PLACE_GROUPS.at(-1);
  const max = profile.crimes[0]?.count || 1;

  return (
    <>
      <SubHeader title={prettyPlace(place)} onBack={onBack}>
        <p className="date-line">
          <Icon name="calendar" size={14} /> {year}년 · {group.label}
        </p>
      </SubHeader>

      <section className="section">
        <div className={`summary-card lv${level}`}>
          <div>
            <small>위험도</small>
            <strong>{RISK_LEVELS[level].label}</strong>
          </div>
          <div>
            <small>발생 순위</small>
            <strong>{index >= 0 ? `${index + 1}위` : '—'}<em> / {items.length}</em></strong>
          </div>
          <div>
            <small>발생 건수</small>
            <strong>{fmt(item?.count ?? 0)}<em>건</em></strong>
          </div>
        </div>

        <div className="panel">
          <h2>다른 장소와 비교</h2>
          <p className="panel-sub">장소가 확인된 범죄 중 {item ? pct(item.share) : '0%'}가 이곳에서 발생했어요.</p>
          <RiskScale level={level} />
        </div>

        <div className="panel">
          <h2>이곳에서 많이 일어난 범죄</h2>
          {profile.crimes.length === 0 && <p className="panel-sub">기록된 범죄가 없어요.</p>}
          <ul className="crime-bars">
            {profile.crimes.slice(0, 5).map((c) => (
              <li key={`${c.large}-${c.medium}`}>
                <span className="crime-name">{c.medium}{c.medium !== c.large && <small>{c.large}</small>}</span>
                <span className="bar"><span style={{ width: `${(c.count / max) * 100}%` }} /></span>
                <span className="row-num">{pct(c.share)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel tips">
          <h2><Icon name="shield" size={18} /> 이런 점을 조심하세요</h2>
          <ul>
            {group.tips.map((t) => <li key={t}>{t}</li>)}
          </ul>
          <a className="call-row" href="tel:112">
            <Icon name="phone" size={18} /> 위급할 땐 112 (문자 신고도 112)
          </a>
        </div>

        <p className="footnote">
          위험도는 발생 건수 순위로 나눈 상대 등급이에요. 이용 인구나 면적은 반영되지 않아서, 사람이 많이 찾는 장소일수록
          높게 나올 수 있어요. 예방 수칙은 일반적인 생활 안전 안내입니다.
        </p>
      </section>
    </>
  );
}
