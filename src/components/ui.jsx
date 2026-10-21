import { useEffect, useRef, useState } from 'react';
import { ALL, RISK_LEVELS } from '../lib/aggregate.js';

// 선 아이콘 (24x24, currentColor). 외부 아이콘 라이브러리 없이 필요한 것만.
const PATHS = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  chart: <path d="M5 20V11M12 20V4M19 20v-6" />,
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  back: <path d="M15 5l-7 7 7 7" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  shield: <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" />,
  zap: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  bag: <path d="M5 8h14l-1 12H6zM9 8V7a3 3 0 0 1 6 0v1" />,
  alert: <path d="M12 3 2 20h20zM12 10v4M12 17h.01" />,
  card: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  map: <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
};

export function Icon({ name, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name] ?? PATHS.shield}
    </svg>
  );
}

export const crimeIcon = (large = '') =>
  large.includes('강력') ? 'zap'
  : large.includes('절도') ? 'bag'
  : large.includes('폭력') ? 'alert'
  : large.includes('지능') ? 'card'
  : 'shield';

// 서버(api/_lib/crimeApi.js)의 DATASETS / TIME_DATASETS 와 같은 연도 목록
export const YEARS = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];
export const TIME_YEARS = [2019, 2018, 2017, 2016, 2015, 2013];

// 기본 <select> 목록은 브라우저 기본 창이라 꾸밀 수 없어서 직접 만든 팝오버로 대체
export function YearSelect({ year, setYear, years = YEARS, tone = 'light', align = 'right' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !rootRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (y) => {
    setYear(y);
    setOpen(false);
    btnRef.current?.focus();
  };

  return (
    <div className="year-select-wrap" ref={rootRef}>
      <button ref={btnRef} className={`year-select ${tone}`} aria-haspopup="dialog" aria-expanded={open}
        onClick={() => setOpen((v) => !v)}>
        <Icon name="calendar" size={16} />
        <span className="sr-only">기준 연도</span>
        {year}년
        <svg className="caret" width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className={`year-pop ${align}`} role="dialog" aria-label="기준 연도 선택">
          <p className="year-pop-title">기준 연도</p>
          <div className="year-grid">
            {years.map((y) => (
              <button key={y} className={y === year ? 'on' : undefined} aria-pressed={y === year}
                autoFocus={y === year} onClick={() => choose(y)}>
                {y}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function RiskBadge({ level }) {
  return <span className={`risk-badge lv${level}`}>{RISK_LEVELS[level].label}</span>;
}

/** 참고 이미지의 "NearSightedness" 스케일 바를 위험도 4단계로 */
export function RiskScale({ level }) {
  return (
    <div className="risk-scale" role="img" aria-label={`위험도 ${RISK_LEVELS[level].label}`}>
      <div className="track">
        {RISK_LEVELS.map((r, i) => (
          <span key={r.id} className={i <= level ? `seg lv${level}` : 'seg'} />
        ))}
        <span className={`marker lv${level}`} style={{ left: `${(level + 0.5) * 25}%` }} />
      </div>
      <ol className="ticks">
        {RISK_LEVELS.map((r, i) => (
          <li key={r.id} className={i === level ? 'on' : undefined}>
            <b>{['하위 40%', '상위 60%', '상위 30%', '상위 10%'][i]}</b>
            {r.label}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function SubHeader({ title, year, setYear, years, onBack, children }) {
  return (
    <header className="sub-header">
      <div className="sub-top">
        {onBack && (
          <button className="icon-btn" onClick={onBack} aria-label="뒤로">
            <Icon name="back" />
          </button>
        )}
        <h1>{title}</h1>
        {setYear && <YearSelect year={year} setYear={setYear} years={years} tone="soft" />}
      </div>
      {children}
    </header>
  );
}

const TABS = [
  { id: 'home', label: '홈', icon: 'home' },
  { id: 'ranking', label: '장소 순위', icon: 'chart' },
  { id: 'region', label: '지역', icon: 'map' },
  { id: 'time', label: '시간·요일', icon: 'clock' },
  { id: 'places', label: '장소 찾기', icon: 'search' },
];

export function BottomNav({ tab, setTab }) {
  return (
    <nav className="bottom-nav" aria-label="메뉴">
      {TABS.map((t) => (
        <button key={t.id} className={tab === t.id ? 'on' : undefined} aria-current={tab === t.id ? 'page' : undefined}
          onClick={() => setTab(t.id)}>
          <Icon name={t.icon} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

/** 범죄 유형 밑줄 탭 (전체 + 대분류). 참고 이미지의 Before / After 탭 */
export function CrimeTabs({ types, value, onChange }) {
  return (
    <div className="seg-tabs" role="tablist" aria-label="범죄 유형">
      {[ALL, ...types].map((l) => (
        <button key={l} role="tab" aria-selected={value === l} onClick={() => onChange(l)}>
          {l === ALL ? '전체' : l}
        </button>
      ))}
    </div>
  );
}

/**
 * 단일 계열 세로 막대 차트 (시간대·요일용).
 * - 색 하나(파랑), 최다 막대만 진하게, "지금" 막대는 위에 라벨
 * - 막대를 누르면 위의 읽기 줄에 값이 나옴 (모바일에서 hover 대신)
 * - 화면 낭독기용 표를 함께 렌더링
 */
export function BarChart({ items, peakKey, nowKey, selectedKey, onSelect, caption, format }) {
  const max = Math.max(...items.map((it) => it.count), 1);
  return (
    <figure className="bar-chart">
      <div className="bars" aria-hidden="true">
        {items.map((it) => {
          const cls = ['bar-col', it.key === peakKey && 'peak', it.key === nowKey && 'now', it.key === selectedKey && 'sel']
            .filter(Boolean).join(' ');
          return (
            <button key={it.key} className={cls} tabIndex={-1} onClick={() => onSelect(it.key)}>
              <span className="bar-track">
                {it.key === nowKey && <span className="now-tag">지금</span>}
                <span className="bar-fill" style={{ height: `${Math.max((it.count / max) * 100, 2)}%` }} />
              </span>
              <span className="bar-label">{it.label}</span>
            </button>
          );
        })}
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {items.map((it) => (
            <tr key={it.key}>
              <th scope="row">{it.label}</th>
              <td>{format(it)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
