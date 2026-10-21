import { useMemo } from 'react';
import { ALL, crimeTypes, riskLevel } from '../lib/aggregate.js';
import { rankDistricts, rankSido, SIDO_ORDER } from '../lib/region.js';
import { fmt, pct } from '../lib/format.js';
import { CrimeTabs, Icon, RiskBadge, SubHeader } from '../components/ui.jsx';

// 지역: 전국이면 "가장 많은 시·군·구 TOP 3 + 시·도 목록", 시·도를 고르면 그 안의 시·군·구 순위.
export default function Regions({ data, view, setView, onOpenRegion }) {
  const { rows, status, asOf } = data;
  const types = useMemo(() => crimeTypes(rows), [rows]);
  const { items, total, foreign } = useMemo(() => rankDistricts(rows, { large: view.large }), [rows, view.large]);
  const sidos = useMemo(() => rankSido(items, total), [items, total]);

  // 위험도는 항상 전국 시·군·구 순위 기준
  const nationalIndex = useMemo(() => new Map(items.map((it, i) => [it.key, i])), [items]);
  const level = (it) => riskLevel(nationalIndex.get(it.key), items.length, it.count);

  const sidoIdx = sidos.findIndex((s) => s.sido === view.sido);
  const sido = sidos[sidoIdx];
  const inSido = view.sido === ALL ? [] : items.filter((it) => it.sido === view.sido);
  const max = (view.sido === ALL ? sidos[0]?.count : inSido[0]?.count) || 1;
  const label = view.large === ALL ? '전체 범죄' : view.large;

  return (
    <>
      <SubHeader title="지역별 통계">
        <p className="date-line tight">
          <Icon name="calendar" size={14} /> {asOf ?? '—'} 공개 자료 · 경찰청
        </p>
        <CrimeTabs types={types} value={view.large} onChange={(large) => setView({ ...view, large })} />
      </SubHeader>

      <div className="chips" aria-label="시·도">
        {[ALL, ...SIDO_ORDER.filter((s) => sidos.some((x) => x.sido === s))].map((s) => (
          <button key={s} className={view.sido === s ? 'chip on' : 'chip'} onClick={() => setView({ ...view, sido: s })}>
            {s === ALL ? '전국' : s}
          </button>
        ))}
      </div>

      <section className="section" aria-busy={status === 'loading'}>
        {status === 'error' && <p className="empty">{data.message}</p>}

        {view.sido === ALL ? (
          <>
            <p className="meta">
              {label} · 전국 {fmt(total)}건{foreign > 0 && ` (해외 발생 ${fmt(foreign)}건 제외)`}
            </p>
            {items.length > 0 && (
              <div className="top3-card">
                <div className="top3-head">
                  <span>순위</span><span>발생 많은 시·군·구</span><span>건수</span><span>비율</span>
                </div>
                {items.slice(0, 3).map((it, i) => (
                  <button key={it.key} className="top3-row" onClick={() => onOpenRegion(it.key)}>
                    <span className="medal">{i + 1}</span>
                    <span className="top3-name">{it.district}<small>{it.sido}</small></span>
                    <span className="cell">{fmt(it.count)}</span>
                    <span className="cell">{pct(it.share)}</span>
                  </button>
                ))}
              </div>
            )}

            <h2 className="list-title">시·도별</h2>
            <ul className="list-card">
              {sidos.map((s, i) => (
                <li key={s.sido}>
                  <button className="list-row" onClick={() => setView({ ...view, sido: s.sido })}>
                    <span className="rank-num">{i + 1}</span>
                    <span className="row-main">
                      <span className="row-name">{s.sido}</span>
                      <span className="bar"><span style={{ width: `${Math.max((s.count / max) * 100, 2)}%` }} /></span>
                    </span>
                    <span className="row-num">{fmt(s.count)}<small className="row-share">{pct(s.share)}</small></span>
                    <Icon name="chevron" size={18} />
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          sido && (
            <>
              <div className="summary-card">
                <div>
                  <small>{sido.sido} 전국 순위</small>
                  <strong>{sidoIdx + 1}위<em> / {sidos.length}</em></strong>
                </div>
                <div>
                  <small>발생 건수</small>
                  <strong>{fmt(sido.count)}<em>건</em></strong>
                </div>
                <div>
                  <small>전국 대비</small>
                  <strong>{pct(sido.share)}</strong>
                </div>
              </div>

              <h2 className="list-title">{sido.sido} 시·군·구 {inSido.length}곳 · {label}</h2>
              <ul className="list-card">
                {inSido.map((it, i) => (
                  <li key={it.key}>
                    <button className="list-row" onClick={() => onOpenRegion(it.key)}>
                      <span className="rank-num">{i + 1}</span>
                      <span className="row-main">
                        <span className="row-name">{it.district}</span>
                        <span className="bar"><span style={{ width: `${Math.max((it.count / max) * 100, 2)}%` }} /></span>
                      </span>
                      <span className="row-num">{fmt(it.count)}</span>
                      <RiskBadge level={level(it)} />
                      <Icon name="chevron" size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )
        )}

        <p className="footnote">
          발생 건수 기준이라 인구가 많은 지역일수록 높게 나와요. 위험도 배지는 전국 시·군·구 {items.length}곳 중 순위로 나눈
          상대 등급입니다.
        </p>
      </section>
    </>
  );
}
