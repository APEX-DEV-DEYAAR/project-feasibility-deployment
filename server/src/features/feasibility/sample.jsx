import React, { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Calendar,
  ArrowUpRight, ArrowDownRight, Minus, Wallet, BarChart3, PieChart,
  Activity, Building2, Download, ChevronRight, Shield, Zap
} from 'lucide-react';

// ── Fallback data ──────────────────────────────────────────────────────────────
const PROJECTS = {
  aya: {
    name: "Aya Beach", date: "Feb '25", approval: "Launch Memo",
    budget:   { revenue: 854, totalCost: 428, profit: 426, marginPct: 49.8, units: 445, nsaTotal: 507331, hardCost: 287, softCost: 14, statutory: 17, contingency: 14, cof: 8, salesExp: 56, marketing: 8 },
    actuals:  { revenue: 312, totalCost: 143, salesUnits: 198, collections: 245, hardCost: 95, softCost: 5, statutory: 6, contingency: 4, cof: 2, salesExp: 18, marketing: 3 },
    forecast: { revenue: 840, totalCost: 434, profit: 406, marginPct: 48.3, hardCost: 292, softCost: 15, statutory: 18, contingency: 14, cof: 8, salesExp: 58, marketing: 9 },
    monthly: [
      { m: "Jan", bSales: 45, aSales: 38, fSales: 40, bColl: 30, aColl: 28, fColl: 28 },
      { m: "Feb", bSales: 50, aSales: 47, fSales: 48, bColl: 35, aColl: 33, fColl: 33 },
      { m: "Mar", bSales: 55, aSales: 52, fSales: 53, bColl: 38, aColl: 36, fColl: 36 },
      { m: "Apr", bSales: 60, aSales: 58, fSales: 58, bColl: 42, aColl: 40, fColl: 40 },
      { m: "May", bSales: 65, aSales: 62, fSales: 63, bColl: 45, aColl: 43, fColl: 43 },
      { m: "Jun", bSales: 70, aSales: 55, fSales: 60, bColl: 48, aColl: 35, fColl: 38 },
      { m: "Jul", bSales: 72, aSales: null, fSales: 65, bColl: 50, aColl: null, fColl: 42 },
      { m: "Aug", bSales: 75, aSales: null, fSales: 68, bColl: 52, aColl: null, fColl: 45 },
    ]
  },
  eleve: {
    name: "Eleve", date: "Jun '25", approval: "BoD",
    budget:   { revenue: 1030, totalCost: 740, profit: 289, marginPct: 28.1, units: 814, nsaTotal: 804418, hardCost: 523, softCost: 16, statutory: 30, contingency: 15, cof: 15, salesExp: 58, marketing: 10 },
    actuals:  { revenue: 420, totalCost: 345, salesUnits: 420, collections: 280, hardCost: 210, softCost: 8, statutory: 14, contingency: 7, cof: 6, salesExp: 25, marketing: 5 },
    forecast: { revenue: 1010, totalCost: 760, profit: 250, marginPct: 24.8, hardCost: 540, softCost: 17, statutory: 32, contingency: 16, cof: 16, salesExp: 62, marketing: 11 },
    monthly: [
      { m: "Jan", bSales: 80, aSales: 65, fSales: 70, bColl: 50, aColl: 40, fColl: 42 },
      { m: "Feb", bSales: 90, aSales: 78, fSales: 82, bColl: 60, aColl: 52, fColl: 54 },
      { m: "Mar", bSales: 95, aSales: 85, fSales: 88, bColl: 65, aColl: 55, fColl: 58 },
      { m: "Apr", bSales: 100, aSales: 92, fSales: 95, bColl: 70, aColl: 58, fColl: 62 },
      { m: "May", bSales: 105, aSales: 100, fSales: 102, bColl: 75, aColl: 55, fColl: 60 },
      { m: "Jun", bSales: 110, aSales: null, fSales: 95, bColl: 78, aColl: null, fColl: 65 },
      { m: "Jul", bSales: 115, aSales: null, fSales: 100, bColl: 80, aColl: null, fColl: 68 },
      { m: "Aug", bSales: 120, aSales: null, fSales: 105, bColl: 85, aColl: null, fColl: 72 },
    ]
  },
  marcasa: {
    name: "Mar Casa", date: "Mar '23", approval: "EXCOM",
    budget:   { revenue: 1121, totalCost: 820, profit: 300, marginPct: 26.8, units: 580, nsaTotal: 664734, hardCost: 546, softCost: 25, statutory: 34, contingency: 0, cof: 12, salesExp: 119, marketing: 10 },
    actuals:  { revenue: 780, totalCost: 648, salesUnits: 465, collections: 620, hardCost: 420, softCost: 18, statutory: 26, contingency: 0, cof: 9, salesExp: 85, marketing: 7 },
    forecast: { revenue: 1100, totalCost: 840, profit: 260, marginPct: 23.6, hardCost: 560, softCost: 26, statutory: 35, contingency: 0, cof: 13, salesExp: 122, marketing: 11 },
    monthly: [
      { m: "Jan", bSales: 55, aSales: 48, fSales: 50, bColl: 42, aColl: 38, fColl: 39 },
      { m: "Feb", bSales: 60, aSales: 55, fSales: 56, bColl: 45, aColl: 42, fColl: 43 },
      { m: "Mar", bSales: 62, aSales: 58, fSales: 59, bColl: 48, aColl: 45, fColl: 45 },
      { m: "Apr", bSales: 65, aSales: 60, fSales: 61, bColl: 50, aColl: 46, fColl: 47 },
      { m: "May", bSales: 68, aSales: 62, fSales: 63, bColl: 52, aColl: 48, fColl: 49 },
      { m: "Jun", bSales: 70, aSales: 58, fSales: 60, bColl: 55, aColl: 42, fColl: 45 },
      { m: "Jul", bSales: 72, aSales: null, fSales: 62, bColl: 58, aColl: null, fColl: 48 },
      { m: "Aug", bSales: 75, aSales: null, fSales: 65, bColl: 60, aColl: null, fColl: 52 },
    ]
  },
  regalia: {
    name: "Regalia", date: "Sep '21", approval: "BoD",
    budget:   { revenue: 1011, totalCost: 821, profit: 190, marginPct: 18.8, units: 913, nsaTotal: 735913, hardCost: 520, softCost: 30, statutory: 40, contingency: 20, cof: 18, salesExp: 95, marketing: 12 },
    actuals:  { revenue: 890, totalCost: 784, salesUnits: 850, collections: 750, hardCost: 498, softCost: 28, statutory: 38, contingency: 18, cof: 17, salesExp: 90, marketing: 11 },
    forecast: { revenue: 1005, totalCost: 830, profit: 175, marginPct: 17.4, hardCost: 528, softCost: 31, statutory: 41, contingency: 20, cof: 19, salesExp: 98, marketing: 13 },
    monthly: [
      { m: "Jan", bSales: 42, aSales: 40, fSales: 40, bColl: 38, aColl: 36, fColl: 36 },
      { m: "Feb", bSales: 45, aSales: 43, fSales: 43, bColl: 40, aColl: 38, fColl: 38 },
      { m: "Mar", bSales: 48, aSales: 46, fSales: 46, bColl: 42, aColl: 40, fColl: 40 },
      { m: "Apr", bSales: 50, aSales: 48, fSales: 48, bColl: 44, aColl: 42, fColl: 42 },
      { m: "May", bSales: 52, aSales: 50, fSales: 50, bColl: 46, aColl: 44, fColl: 44 },
      { m: "Jun", bSales: 55, aSales: 52, fSales: 52, bColl: 48, aColl: 45, fColl: 45 },
      { m: "Jul", bSales: 55, aSales: 50, fSales: 50, bColl: 48, aColl: 44, fColl: 44 },
      { m: "Aug", bSales: 58, aSales: null, fSales: 52, bColl: 50, aColl: null, fColl: 46 },
    ]
  }
};

// ── Helpers ─────────────────────────────────────────────────────────────────────
const isN = v => typeof v === "number" && Number.isFinite(v);
const n0 = v => isN(v) ? v : 0;
const fmt = v => { if (!isN(v)) return "\u2014"; return Math.abs(v) >= 1000 ? (v/1000).toFixed(1)+"B" : v.toFixed(0)+"M"; };
const fmtPct = v => isN(v) ? v.toFixed(1)+"%" : "\u2014";
const diff = (a,b) => isN(a) && isN(b) ? a-b : null;
const ratio = (n,d) => isN(n) && isN(d) && d!==0 ? n/d : null;

// ── Theme ───────────────────────────────────────────────────────────────────────
const C = {
  bg:       '#F8F6F1',
  surface:  '#FFFFFF',
  primary:  '#2C1810',
  secondary:'#5C4028',
  accent:   '#C9592E',
  accentLt: '#F2E0D5',
  muted:    '#8C7B6B',
  border:   '#E8E0D4',
  borderLt: '#F0EBE3',
  success:  '#0D7C5F',
  successBg:'#ECFDF5',
  warning:  '#B45309',
  warningBg:'#FFFBEB',
  danger:   '#BE2D2D',
  dangerBg: '#FEF2F2',
  chart1:   '#2C1810',
  chart2:   '#C9592E',
  chart3:   '#D4C4AC',
};

// ── Subcomponents ───────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, trend, color }) => {
  const trendColor = trend > 0 ? C.success : trend < 0 ? C.danger : C.muted;
  const TrendIcon = trend > 0 ? ArrowUpRight : trend < 0 ? ArrowDownRight : Minus;
  return (
    <div style={{
      background: C.surface, borderRadius: 12, padding: '20px 22px',
      border: `1px solid ${C.border}`, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color || C.accent }} />
      <div style={{ fontSize: 11, fontWeight: 500, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: C.primary, letterSpacing: '-0.02em', fontFamily: 'Georgia, serif' }}>{value}</span>
        {isN(trend) && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 600, color: trendColor, background: trend > 0 ? C.successBg : trend < 0 ? C.dangerBg : C.borderLt, padding: '2px 7px', borderRadius: 20 }}>
            <TrendIcon size={12} />{Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{sub}</div>}
    </div>
  );
};

const SectionTitle = ({ children, icon: Icon }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
    {Icon && <Icon size={15} style={{ color: C.accent }} />}
    <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{children}</span>
  </div>
);

const Panel = ({ children, style: sx, ...props }) => (
  <div style={{
    background: C.surface, borderRadius: 12, padding: 22,
    border: `1px solid ${C.border}`, ...sx
  }} {...props}>{children}</div>
);

const BarChart = ({ data, bKey, aKey, fKey, title, icon }) => {
  const allVals = data.flatMap(d => [d[bKey], d[aKey], d[fKey]]).filter(isN);
  const max = Math.max(...allVals, 1) * 1.12;
  const barW = 10; const gap = 2; const groupGap = 16;
  return (
    <Panel style={{ flex: 1 }}>
      <SectionTitle icon={icon}>{title}</SectionTitle>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {[['Budget', C.chart3], ['Actual', C.chart1], ['Forecast', C.chart2]].map(([l,c]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: C.muted }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: c, display: 'inline-block' }} />{l}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: groupGap, justifyContent: 'space-between' }}>
        {data.map((d, i) => {
          const bH = (n0(d[bKey]) / max) * 120;
          const aH = isN(d[aKey]) ? (d[aKey] / max) * 120 : 0;
          const fH = (n0(d[fKey]) / max) * 120;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', gap: gap, alignItems: 'flex-end', height: 120 }}>
                <div style={{ width: barW, height: Math.max(bH, 1), background: C.chart3, borderRadius: '3px 3px 0 0' }} />
                {isN(d[aKey]) && <div style={{ width: barW, height: Math.max(aH, 1), background: C.chart1, borderRadius: '3px 3px 0 0' }} />}
                <div style={{ width: barW, height: Math.max(fH, 1), background: C.chart2, borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
              </div>
              <span style={{ fontSize: 10, color: C.muted, fontWeight: 500 }}>{d.m}</span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

const Gauge = ({ label, value, pct, color }) => {
  const circ = 2 * Math.PI * 32;
  const offset = circ - (Math.min(n0(pct), 100) / 100) * circ;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 76, height: 76, margin: '0 auto 6px' }}>
        <svg width="76" height="76" viewBox="0 0 76 76" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="38" cy="38" r="32" fill="none" stroke={C.borderLt} strokeWidth="5" />
          <circle cx="38" cy="38" r="32" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: C.primary, fontFamily: 'Georgia, serif' }}>{value}</div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  );
};

const HorizBar = ({ label, budget, actual, forecast, max }) => {
  const m = max || 1;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.secondary }}>{label}</span>
        <span style={{ fontSize: 11, color: C.muted, fontFamily: 'Georgia, serif' }}>{fmt(forecast)}</span>
      </div>
      <div style={{ display: 'flex', gap: 3 }}>
        {[[budget, C.chart3], [actual, C.chart1], [forecast, C.chart2]].map(([v, c], i) => (
          <div key={i} style={{ flex: 1, height: 8, background: C.borderLt, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${(n0(v)/m)*100}%`, height: '100%', background: c, borderRadius: 4, transition: 'width 0.6s ease' }} />
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main Dashboard ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [projects, setProjects] = useState(PROJECTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [active, setActive] = useState("eleve");
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    let mounted = true;
    fetch("/api/cfo-dashboard", { credentials: "include", headers: { "X-Requested-With": "XMLHttpRequest" } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        if (!mounted) return;
        const next = d?.projects && Object.keys(d.projects).length ? d.projects : PROJECTS;
        setProjects(next);
        setActive(curr => next[curr] ? curr : Object.keys(next)[0]);
        setLoading(false);
      })
      .catch(e => {
        if (!mounted) return;
        setError(String(e));
        setProjects(PROJECTS);
        setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const p = projects[active] || projects[Object.keys(projects)[0]];
  if (!p) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, color: C.primary, fontFamily: 'Inter, system-ui, sans-serif' }}>
      No project data available.
    </div>
  );

  const b = p.budget, a = p.actuals, f = p.forecast;

  const m = useMemo(() => ({
    collEff:  ratio(a.collections, a.revenue) !== null ? ratio(a.collections, a.revenue) * 100 : null,
    salesVel: ratio(a.salesUnits, b.units) !== null ? ratio(a.salesUnits, b.units) * 100 : null,
    costVar:  diff(f.totalCost, b.totalCost),
    profVar:  diff(f.profit, b.profit),
    outRecv:  diff(a.revenue, a.collections),
  }), [a, b, f]);

  const alerts = useMemo(() => {
    const list = [];
    if (isN(m.profVar) && m.profVar < 0) list.push({ t: "danger", icon: TrendingDown, msg: `Profit erosion of ${fmt(Math.abs(m.profVar))} AED vs budget \u2014 margin compressed to ${fmtPct(f.marginPct)}` });
    if (isN(m.costVar) && m.costVar > 0) list.push({ t: "warning", icon: AlertTriangle, msg: `Cost overrun of +${fmt(m.costVar)} AED across tracked categories` });
    if (isN(m.collEff) && m.collEff < 70) list.push({ t: "danger", icon: AlertTriangle, msg: `Collection efficiency at ${fmtPct(m.collEff)} \u2014 below 70% threshold` });
    if (isN(m.collEff) && m.collEff >= 75) list.push({ t: "success", icon: CheckCircle2, msg: `Collection efficiency healthy at ${fmtPct(m.collEff)}` });
    if (isN(m.salesVel) && m.salesVel > 80) list.push({ t: "success", icon: Zap, msg: `Strong sales velocity at ${fmtPct(m.salesVel)} of target units` });
    return list;
  }, [m, b, f, a]);

  const tabs = [
    { id: "overview", label: "Executive Overview", icon: BarChart3 },
    { id: "sales", label: "Sales & Revenue", icon: TrendingUp },
    { id: "collections", label: "Collections", icon: Wallet },
    { id: "costs", label: "Cost Analysis", icon: PieChart },
  ];

  const profitTrend = isN(m.profVar) && isN(b.profit) && b.profit !== 0 ? (m.profVar / b.profit) * 100 : null;
  const costTrend = isN(m.costVar) && isN(b.totalCost) && b.totalCost !== 0 ? (m.costVar / b.totalCost) * 100 : null;
  const revTrend = isN(diff(f.revenue, b.revenue)) && isN(b.revenue) && b.revenue !== 0 ? (diff(f.revenue, b.revenue) / b.revenue) * 100 : null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: C.bg, fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>

      {/* ── Header ── */}
      <header style={{ background: C.primary, color: '#fff', flexShrink: 0 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <img src="/deyaar-logo.png" alt="DEYAAR" style={{ height: 28, filter: 'brightness(0) invert(1)' }} />
              <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.2)' }} />
              <div>
                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Executive Dashboard</div>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>CFO Financial Overview</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              {/* Meta pills */}
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  [Calendar, p.date],
                  [Shield, p.approval],
                  [Building2, `${n0(b.units)} Units`],
                ].map(([Icon, text], i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
                    <Icon size={13} />{text}
                  </div>
                ))}
              </div>
              {/* Project selector */}
              <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 3 }}>
                {Object.keys(projects).map(k => (
                  <button key={k} onClick={() => setActive(k)} style={{
                    padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    background: active === k ? '#fff' : 'transparent',
                    color: active === k ? C.primary : 'rgba(255,255,255,0.7)',
                  }}>{projects[k].name}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 2, paddingBottom: 0 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
                fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                borderBottom: `2px solid ${tab === t.id ? C.accent : 'transparent'}`,
                background: 'transparent',
                color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.5)',
                transition: 'all 0.2s',
              }}>
                <t.icon size={14} />{t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Status bar */}
      {(loading || error) && (
        <div style={{ background: error ? C.dangerBg : C.warningBg, padding: '8px 28px', fontSize: 12, color: error ? C.danger : C.warning, fontWeight: 500 }}>
          {loading ? "Connecting to live data source..." : `Data source: ${error}`}
        </div>
      )}

      {/* ── Content ── */}
      <main style={{ flex: 1, maxWidth: 1400, width: '100%', margin: '0 auto', padding: '24px 28px 32px', overflowY: 'auto' }}>

        {/* ═══ OVERVIEW TAB ═══ */}
        {tab === "overview" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <KpiCard label="Revenue Forecast" value={fmt(f.revenue)} sub={`Budget: ${fmt(b.revenue)} AED`} trend={revTrend} color={C.accent} />
              <KpiCard label="Total Cost Forecast" value={fmt(f.totalCost)} sub={`Variance: ${isN(m.costVar) && m.costVar>0?'+':''}${fmt(m.costVar)}`} trend={costTrend} color={isN(m.costVar) && m.costVar > 0 ? C.danger : C.success} />
              <KpiCard label="Net Profit" value={fmt(f.profit)} sub={`Margin: ${fmtPct(f.marginPct)}`} trend={profitTrend} color={isN(m.profVar) && m.profVar < 0 ? C.danger : C.success} />
              <KpiCard label="Collections" value={fmt(a.collections)} sub={`Efficiency: ${fmtPct(m.collEff)}`} color={isN(m.collEff) && m.collEff >= 70 ? C.success : C.warning} />
            </div>

            {/* Charts + Gauges + Alerts */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
              {/* Performance bars */}
              <Panel>
                <SectionTitle icon={Activity}>Performance Snapshot</SectionTitle>
                <HorizBar label="Revenue" budget={b.revenue} actual={a.revenue} forecast={f.revenue} max={Math.max(n0(b.revenue), n0(f.revenue), 1)} />
                <HorizBar label="Total Cost" budget={b.totalCost} actual={a.totalCost} forecast={f.totalCost} max={Math.max(n0(b.totalCost)*1.1, 1)} />
                <HorizBar label="Net Profit" budget={b.profit} actual={diff(a.revenue, a.totalCost)} forecast={f.profit} max={Math.max(n0(b.profit)*1.2, 1)} />
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  {[['Budget', C.chart3], ['Actual', C.chart1], ['Forecast', C.chart2]].map(([l,c]) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: C.muted }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: c, display: 'inline-block' }} />{l}
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Gauges */}
              <Panel>
                <SectionTitle icon={Activity}>Key Ratios</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
                  <Gauge label="Sales Velocity" value={fmtPct(m.salesVel)} pct={n0(m.salesVel)} color={isN(m.salesVel) && m.salesVel > 50 ? C.success : C.warning} />
                  <Gauge label="Collections" value={fmtPct(m.collEff)} pct={n0(m.collEff)} color={isN(m.collEff) && m.collEff >= 70 ? C.success : C.danger} />
                  <Gauge label="Margin" value={fmtPct(f.marginPct)} pct={n0(f.marginPct)} color={n0(f.marginPct) > 25 ? C.success : n0(f.marginPct) > 15 ? C.warning : C.danger} />
                  <Gauge label="Cost Var" value={fmt(m.costVar)} pct={Math.min(Math.abs(n0(ratio(m.costVar, b.totalCost))) * 200, 100)} color={isN(m.costVar) && m.costVar > 0 ? C.danger : C.success} />
                </div>
              </Panel>

              {/* Alerts */}
              <Panel>
                <SectionTitle icon={AlertTriangle}>Alerts & Signals</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {alerts.length === 0 && <div style={{ fontSize: 12, color: C.muted, padding: '12px 0' }}>No active alerts.</div>}
                  {alerts.map((al, i) => {
                    const bg = al.t === 'danger' ? C.dangerBg : al.t === 'warning' ? C.warningBg : C.successBg;
                    const fg = al.t === 'danger' ? C.danger : al.t === 'warning' ? C.warning : C.success;
                    return (
                      <div key={i} style={{ display: 'flex', gap: 8, padding: '10px 12px', borderRadius: 8, background: bg, fontSize: 11, lineHeight: 1.5, color: fg, fontWeight: 500 }}>
                        <al.icon size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span>{al.msg}</span>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>

            {/* Trend charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <BarChart data={p.monthly} bKey="bSales" aKey="aSales" fKey="fSales" title="Monthly Sales Trend" icon={TrendingUp} />
              <BarChart data={p.monthly} bKey="bColl" aKey="aColl" fKey="fColl" title="Monthly Collections" icon={Wallet} />
            </div>
          </div>
        )}

        {/* ═══ SALES TAB ═══ */}
        {tab === "sales" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
              <KpiCard label="Budget Revenue" value={fmt(b.revenue)} color={C.chart3} />
              <KpiCard label="Actual Revenue" value={fmt(a.revenue)} sub={`${a.salesUnits ?? '\u2014'} units sold`} color={C.chart1} />
              <KpiCard label="Forecast Revenue" value={fmt(f.revenue)} trend={revTrend} color={C.accent} />
              <KpiCard label="Sales Velocity" value={fmtPct(m.salesVel)} sub={`${a.salesUnits ?? '\u2014'} / ${b.units ?? '\u2014'} units`} color={isN(m.salesVel) && m.salesVel > 50 ? C.success : C.warning} />
              <KpiCard label="Avg Price / Unit" value={fmt(ratio(a.revenue, a.salesUnits))} color={C.primary} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              <BarChart data={p.monthly} bKey="bSales" aKey="aSales" fKey="fSales" title="Monthly Sales Performance" icon={TrendingUp} />
              <Panel>
                <SectionTitle icon={BarChart3}>Sales Summary</SectionTitle>
                {[
                  { l: 'Units Sold', v: `${a.salesUnits ?? '\u2014'} / ${b.units ?? '\u2014'}`, pct: isN(ratio(a.salesUnits, b.units)) ? (ratio(a.salesUnits, b.units)*100).toFixed(0)+'%' : '\u2014' },
                  { l: 'Actual Revenue', v: fmt(a.revenue), pct: isN(ratio(a.revenue, b.revenue)) ? (ratio(a.revenue, b.revenue)*100).toFixed(0)+'%' : '\u2014' },
                  { l: 'Forecast vs Budget', v: fmt(diff(f.revenue, b.revenue)), pct: isN(ratio(diff(f.revenue, b.revenue), b.revenue)) ? (ratio(diff(f.revenue, b.revenue), b.revenue)*100).toFixed(1)+'%' : '\u2014' },
                ].map((it, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: i%2===0 ? C.bg : C.surface, borderRadius: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: C.muted }}>{it.l}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.primary, fontFamily: 'Georgia, serif' }}>{it.v}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{it.pct} of budget</div>
                    </div>
                  </div>
                ))}
              </Panel>
            </div>
          </div>
        )}

        {/* ═══ COLLECTIONS TAB ═══ */}
        {tab === "collections" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <KpiCard label="Total Collected" value={fmt(a.collections)} color={C.success} />
              <KpiCard label="Outstanding" value={fmt(m.outRecv)} color={C.warning} />
              <KpiCard label="Collection Efficiency" value={fmtPct(m.collEff)} sub={isN(m.collEff) && m.collEff >= 70 ? 'Above threshold' : 'Below 70% target'} color={isN(m.collEff) && m.collEff >= 70 ? C.success : C.danger} />
              <KpiCard label="Cash Position" value={isN(diff(a.collections, n0(a.hardCost))) && diff(a.collections, n0(a.hardCost)) > 0 ? 'Surplus' : 'Deficit'} sub={fmt(Math.abs(n0(diff(a.collections, n0(a.hardCost)))))} color={n0(a.collections) > n0(a.hardCost) ? C.success : C.danger} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              <BarChart data={p.monthly} bKey="bColl" aKey="aColl" fKey="fColl" title="Monthly Collections Trend" icon={Wallet} />
              <Panel>
                <SectionTitle icon={Activity}>Cash Flow Summary</SectionTitle>
                {[
                  { l: 'Total Sales Revenue', v: a.revenue, c: C.primary },
                  { l: 'Total Collected', v: a.collections, c: C.success },
                  { l: 'Outstanding Receivables', v: m.outRecv, c: C.warning },
                  { l: 'Net Cash Position', v: diff(a.collections, n0(a.hardCost)), c: n0(a.collections) > n0(a.hardCost) ? C.success : C.danger },
                ].map((it, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: i < 3 ? `1px solid ${C.borderLt}` : 'none' }}>
                    <span style={{ fontSize: 12, color: C.muted }}>{it.l}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Georgia, serif', color: it.c }}>{fmt(it.v)}</span>
                  </div>
                ))}
              </Panel>
            </div>
          </div>
        )}

        {/* ═══ COSTS TAB ═══ */}
        {tab === "costs" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <KpiCard label="Budget Cost" value={fmt(b.totalCost)} color={C.chart3} />
              <KpiCard label="Actual Cost" value={fmt(a.totalCost)} sub={isN(ratio(a.totalCost, b.totalCost)) ? (ratio(a.totalCost, b.totalCost)*100).toFixed(0)+'% of budget' : '\u2014'} color={C.chart1} />
              <KpiCard label="Forecast Cost" value={fmt(f.totalCost)} trend={costTrend} color={C.accent} />
              <KpiCard label="Cost Variance" value={`${isN(m.costVar) && m.costVar>0?'+':''}${fmt(m.costVar)}`} color={isN(m.costVar) && m.costVar > 0 ? C.danger : C.success} />
            </div>
            <Panel style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 22px', background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                <SectionTitle icon={PieChart}>Cost Breakdown by Category</SectionTitle>
              </div>
              <div style={{ padding: '0 22px 22px' }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Category', 'Budget', 'Actual', 'Forecast', 'Variance', ''].map((h, i) => (
                        <th key={i} style={{ padding: '14px 12px', textAlign: i === 0 ? 'left' : 'right', fontWeight: 600, color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `2px solid ${C.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { n: 'Construction', k: 'hardCost' },
                      { n: 'Professional Fees', k: 'softCost' },
                      { n: 'Authority / Statutory', k: 'statutory' },
                      { n: 'Contingency', k: 'contingency' },
                      { n: 'Cost of Finance', k: 'cof' },
                      { n: 'Sales Expenses', k: 'salesExp' },
                      { n: 'Marketing', k: 'marketing' },
                    ].map((r, i) => {
                      const bv = n0(b[r.k]), av = n0(a[r.k]), fv = n0(f[r.k]);
                      const v = fv - bv;
                      const vPct = bv !== 0 ? (v / bv * 100) : 0;
                      return (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.borderLt}` }}>
                          <td style={{ padding: '12px', color: C.secondary, fontWeight: 500 }}>{r.n}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'Georgia, serif', color: C.muted }}>{fmt(bv)}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'Georgia, serif', color: C.secondary }}>{fmt(av)}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'Georgia, serif', fontWeight: 700, color: C.primary }}>{fmt(fv)}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'Georgia, serif', fontWeight: 700, color: v > 0 ? C.danger : v < 0 ? C.success : C.muted }}>
                            {v > 0 ? '+' : ''}{fmt(v)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', width: 80 }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: v > 0 ? C.dangerBg : v < 0 ? C.successBg : C.borderLt, color: v > 0 ? C.danger : v < 0 ? C.success : C.muted }}>
                              {v > 0 ? <ArrowUpRight size={10}/> : v < 0 ? <ArrowDownRight size={10}/> : <Minus size={10}/>}
                              {Math.abs(vPct).toFixed(1)}%
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Total row */}
                    <tr style={{ background: C.bg }}>
                      <td style={{ padding: '12px', fontWeight: 700, color: C.primary }}>Total</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'Georgia, serif', fontWeight: 700, color: C.primary }}>{fmt(b.totalCost)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'Georgia, serif', fontWeight: 700, color: C.primary }}>{fmt(a.totalCost)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'Georgia, serif', fontWeight: 700, color: C.primary }}>{fmt(f.totalCost)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'Georgia, serif', fontWeight: 700, color: isN(m.costVar) && m.costVar > 0 ? C.danger : C.success }}>{isN(m.costVar) && m.costVar>0?'+':''}{fmt(m.costVar)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: '12px 28px', flexShrink: 0 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: C.muted }}>&copy; {new Date().getFullYear()} Deyaar Development PJSC &middot; Confidential</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.muted }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.success, display: 'inline-block' }} />
              Data Source: {loading ? 'Connecting...' : error ? 'Fallback' : 'Live'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
