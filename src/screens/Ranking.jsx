import { useMemo, useState } from 'react';
import { ALL, categoryTree, crimeTypeSummary, rankPlaces, riskLevel } from '../lib/aggregate.js';
import { fmt, pct } from '../lib/format.js';
import { CrimeTabs, Icon, RiskBadge, SubHeader } from '../components/ui.jsx';

const PAGE = 15;

// 순위: 범죄 유형 탭 하나만 고르면 바로 장소 순위. (참고 이미지의 Operation Info 화면 구조)
export default function Ranking({ rows, status, year, setYear, crime, setCrime, onOpenPlace }) {
  const [showAll, setShowAll] = useState(false);
  const tree = useMemo(() => categoryTree(rows), [rows]);
  const types = useMemo(() => crimeTypeSummary(rows).map((t) => t.large), [rows]);
  const { items, total, unspecified } = useMemo(() => rankPlaces(rows, crime), [rows, crime]);

  const mediums = tree.get(crime.large) ?? [];
  const max = items[0]?.count || 1;
  const rest = items.slice(3, showAll ? undefined : PAGE);
  const label = crime.medium !== ALL ? crime.medium : crime.large !== ALL ? crime.large : '전체 범죄';

  const pick = (next) => {
    setCrime(next);
    setShowAll(false);
  };

  return (
    <>
      <SubHeader title="장소별 순위" year={year} setYear={setYear}>
        <CrimeTabs types={types} value={crime.large} onChange={(l) => pick({ large: l, medium: ALL })} />
      </SubHeader>

      {mediums.length > 1 && (
        <div className="chips" aria-label="세부 유형">
          {[ALL, ...mediums].map((m) => (
            <button key={m} className={crime.medium === m ? 'chip on' : 'chip'}
              onClick={() => pick({ ...crime, medium: m })}>
              {m === ALL ? '전체' : m}
            </button>
          ))}
        </div>
      )}

      <section className="section" aria-busy={status === 'loading'}>
        <p className="meta">
          {label} · {fmt(total)}건{unspecified > 0 && ` (장소 기타·미상 ${fmt(unspecified)}건 제외)`}
        </p>

        {items.length === 0 && status !== 'loading' && <p className="empty">표시할 데이터가 없어요.</p>}

        {items.length > 0 && (
          <div className="top3-card">
            <div className="top3-head">
              <span>순위</span><span>장소</span><span>건수</span><span>비율</span>
            </div>
            {items.slice(0, 3).map((it, i) => (
              <button key={it.place} className="top3-row" onClick={() => onOpenPlace(it.place)}>
                <span className="medal">{i + 1}</span>
                <span className="top3-name">{it.label}</span>
                <span className="cell">{fmt(it.count)}</span>
                <span className="cell">{pct(it.share)}</span>
              </button>
            ))}
          </div>
        )}

        <ol className="list-card rank-list" start={4}>
          {rest.map((it, i) => (
            <li key={it.place}>
              <button className="list-row" onClick={() => onOpenPlace(it.place)}>
                <span className="rank-num">{i + 4}</span>
                <span className="row-main">
                  <span className="row-name">{it.label}</span>
                  <span className="bar"><span style={{ width: `${Math.max((it.count / max) * 100, 2)}%` }} /></span>
                </span>
                <span className="row-num">{fmt(it.count)}</span>
                <RiskBadge level={riskLevel(i + 3, items.length, it.count)} />
                <Icon name="chevron" size={18} />
              </button>
            </li>
          ))}
        </ol>

        {items.length > PAGE && (
          <button className="more-btn" onClick={() => setShowAll((v) => !v)}>
            {showAll ? '접기' : `${items.length}개 장소 모두 보기`}
          </button>
        )}
      </section>
    </>
  );
}
