import { useMemo, useState } from 'react';
import { ALL, PLACE_GROUPS, rankPlaces, riskLevel } from '../lib/aggregate.js';
import { fmt } from '../lib/format.js';
import { Icon, RiskBadge, SubHeader } from '../components/ui.jsx';

const norm = (s) => s.replace(/[\s·_]/g, '');

// 장소 찾기: "내가 갈 곳은 어떤가?"를 검색 한 번으로. 위험도는 전체 범죄 기준 순위.
export default function Places({ rows, year, setYear, onOpenPlace }) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState(ALL);

  const ranked = useMemo(() => {
    const { items } = rankPlaces(rows);
    return items.map((it, i) => ({ ...it, level: riskLevel(i, items.length, it.count) }));
  }, [rows]);

  const q = norm(query);
  const shown = ranked.filter(
    (it) => (group === ALL || it.group === group) && (!q || norm(it.label).includes(q)),
  );

  return (
    <>
      <SubHeader title="장소 찾기" year={year} setYear={setYear}>
        <label className="search">
          <Icon name="search" size={20} />
          <span className="sr-only">장소 검색</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="편의점, 지하철역, 공원…" enterKeyHint="search" />
        </label>
      </SubHeader>

      <div className="chips" aria-label="장소 종류">
        {[{ id: ALL, label: '전체' }, ...PLACE_GROUPS].map((g) => (
          <button key={g.id} className={group === g.id ? 'chip on' : 'chip'} onClick={() => setGroup(g.id)}>
            {g.label}
          </button>
        ))}
      </div>

      <section className="section">
        <p className="meta">{shown.length}개 장소 · 발생 많은 순</p>
        {shown.length === 0 && <p className="empty">찾는 장소가 없어요. 다른 단어로 검색해 보세요.</p>}
        <ul className="list-card">
          {shown.map((it) => (
            <li key={it.place}>
              <button className="list-row" onClick={() => onOpenPlace(it.place)}>
                <span className={`dot lv${it.level}`} aria-hidden="true" />
                <span className="row-name">{it.label}</span>
                <span className="row-num">{fmt(it.count)}건</span>
                <RiskBadge level={it.level} />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
