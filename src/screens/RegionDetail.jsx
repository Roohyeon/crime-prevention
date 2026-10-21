import { useMemo } from 'react';
import { placeProfile, riskLevel, RISK_LEVELS } from '../lib/aggregate.js';
import { rankDistricts } from '../lib/region.js';
import { fmt, pct } from '../lib/format.js';
import { Icon, RiskScale, SubHeader } from '../components/ui.jsx';

// 시·군·구 상세: 장소 상세와 같은 순서 (위험도 → 비교 → 많이 일어난 범죄)
export default function RegionDetail({ data, regionKey, onBack }) {
  const { rows, asOf } = data;
  const { items } = useMemo(() => rankDistricts(rows), [rows]);
  // 컬럼 하나의 범죄 유형별 합계라 장소 상세와 같은 함수를 그대로 씀
  const profile = useMemo(() => placeProfile(rows, regionKey), [rows, regionKey]);

  const index = items.findIndex((it) => it.key === regionKey);
  const item = items[index];
  if (!item) return <SubHeader title="지역" onBack={onBack} />;

  const level = riskLevel(index, items.length, item.count);
  const sameSido = items.filter((it) => it.sido === item.sido);
  const sidoIndex = sameSido.findIndex((it) => it.key === regionKey);
  const max = profile.crimes[0]?.count || 1;

  return (
    <>
      <SubHeader title={item.district} onBack={onBack}>
        <p className="date-line">
          <Icon name="map" size={14} /> {item.sido} · {asOf} 공개 자료
        </p>
      </SubHeader>

      <section className="section">
        <div className={`summary-card lv${level}`}>
          <div>
            <small>위험도</small>
            <strong>{RISK_LEVELS[level].label}</strong>
          </div>
          <div>
            <small>전국 순위</small>
            <strong>{index + 1}위<em> / {items.length}</em></strong>
          </div>
          <div>
            <small>발생 건수</small>
            <strong>{fmt(item.count)}<em>건</em></strong>
          </div>
        </div>

        <div className="panel">
          <h2>다른 지역과 비교</h2>
          <p className="panel-sub">
            {item.sido} {sameSido.length}곳 중 {sidoIndex + 1}위 · 전국 범죄의 {pct(item.share)}
          </p>
          <RiskScale level={level} />
        </div>

        <div className="panel">
          <h2>이 지역에서 많이 일어난 범죄</h2>
          <ul className="crime-bars">
            {profile.crimes.slice(0, 5).map((c) => (
              <li key={`${c.large}-${c.medium}`}>
                <span className="crime-name">{c.medium}{c.medium !== c.large && <small>{c.large}</small>}</span>
                <span className="bar"><span style={{ width: `${(c.count / max) * 100}%` }} /></span>
                <span className="row-num">{pct(c.share)}</span>
              </li>
            ))}
          </ul>
          <a className="call-row" href="tel:112">
            <Icon name="phone" size={18} /> 위급할 땐 112 (문자 신고도 112)
          </a>
        </div>

        <p className="footnote">
          위험도는 전국 시·군·구의 발생 건수 순위로 나눈 상대 등급이에요. 인구·면적은 반영되지 않아서 인구가 많은 지역일수록
          높게 나올 수 있어요.
        </p>
      </section>
    </>
  );
}
