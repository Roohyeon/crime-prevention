import { useMemo, useState } from 'react';
import { crimeTypes, riskLevel } from '../lib/aggregate.js';
import { DAYS, rankOf, slotAt, slotLabel, timeProfile } from '../lib/time.js';
import { fmt, pct } from '../lib/format.js';
import { BarChart, CrimeTabs, Icon, RiskBadge, SubHeader, TIME_YEARS } from '../components/ui.jsx';

const maxBy = (list) => list.reduce((m, it) => (!m || it.count > m.count ? it : m), null);

// 시간·요일: "지금이 위험한 시간인가?"를 맨 위에, 그 아래 시간대·요일 막대 차트.
export default function TimeScreen({ data, year, setYear, large, setLarge }) {
  const { rows, status } = data;
  const types = useMemo(() => crimeTypes(rows), [rows]);
  const p = useMemo(() => timeProfile(rows, { large }), [rows, large]);

  const now = new Date();
  const nowSlot = slotAt(p.slots, now.getHours());
  const today = DAYS[now.getDay()];
  const nowRank = nowSlot ? rankOf(p.slots, nowSlot.key) : -1;
  const peakSlot = maxBy(p.slots);
  const peakDay = maxBy(p.days);

  // 막대를 누르면 값 표시. 처음엔 "지금" 막대
  const [slotSel, setSlotSel] = useState(null);
  const [daySel, setDaySel] = useState(null);
  const selSlot = p.slots.find((s) => s.key === (slotSel ?? nowSlot?.key));
  const selDay = p.days.find((d) => d.key === (daySel ?? today));

  const loading = status === 'loading';
  const empty = !loading && p.slots.length === 0;

  return (
    <>
      <SubHeader title="시간·요일" year={year} setYear={setYear} years={TIME_YEARS}>
        <p className="date-line tight">
          <Icon name="calendar" size={14} />
          {status === 'demo' ? '예시 데이터 · API 연결 전' : `${year}년 자료 · 경찰청${year === TIME_YEARS[0] ? ' (가장 최근 공개분)' : ''}`}
        </p>
        <CrimeTabs types={types} value={large} onChange={setLarge} />
      </SubHeader>

      <section className="section" aria-busy={loading}>
        {status === 'error' && <p className="empty">{data.message}</p>}
        {empty && status !== 'error' && <p className="empty">표시할 데이터가 없어요.</p>}

        {nowSlot && (
          <div className="now-card">
            <span className="now-icon"><Icon name="clock" size={24} /></span>
            <span className="now-text">
              <small>지금 {today}요일 {slotLabel(nowSlot)}</small>
              <strong>하루 중 {nowRank + 1}번째로 많은 시간대</strong>
            </span>
            <RiskBadge level={riskLevel(nowRank, p.slots.length)} />
          </div>
        )}

        {peakSlot && peakDay && (
          <div className="summary-card two">
            <div>
              <small>가장 많은 시간대</small>
              <strong>{slotLabel(peakSlot)}</strong>
              <em className="sub">{pct(peakSlot.share)}</em>
            </div>
            <div>
              <small>가장 많은 요일</small>
              <strong>{peakDay.label}요일</strong>
              <em className="sub">{pct(peakDay.share)}</em>
            </div>
          </div>
        )}

        {p.slots.length > 0 && (
          <div className="panel">
            <h2>시간대별 발생</h2>
            {selSlot && (
              <p className="readout">
                <b>{slotLabel(selSlot)}</b> {fmt(selSlot.count)}건 · {pct(selSlot.share)}
              </p>
            )}
            <BarChart items={p.slots} peakKey={peakSlot?.key} nowKey={nowSlot?.key} selectedKey={selSlot?.key}
              onSelect={setSlotSel} caption="시간대별 발생 건수"
              format={(it) => `${slotLabel(it)} ${fmt(it.count)}건 (${pct(it.share)})`} />
            {p.unknown > 0 && <p className="panel-note">발생 시간 미상 {fmt(p.unknown)}건은 제외했어요.</p>}
          </div>
        )}

        {p.dayTotal > 0 && (
          <div className="panel">
            <h2>요일별 발생</h2>
            {selDay && (
              <p className="readout">
                <b>{selDay.label}요일</b> {fmt(selDay.count)}건 · {pct(selDay.share)}
              </p>
            )}
            <BarChart items={p.days} peakKey={peakDay?.key} nowKey={today} selectedKey={selDay?.key}
              onSelect={setDaySel} caption="요일별 발생 건수"
              format={(it) => `${it.label}요일 ${fmt(it.count)}건 (${pct(it.share)})`} />
          </div>
        )}

        <p className="footnote">
          막대를 누르면 건수가 보여요. 진한 막대가 가장 많은 시간대·요일이고, 위험도는 하루 8개 시간대 중 순위로 나눈 상대
          등급입니다.
        </p>
      </section>
    </>
  );
}
