// Sample data, formatters, icons and SVG chart helpers shared by the mockups.
// "Today" is fixed at 18 Nov 2026 so every mockup agrees.

const TODAY = new Date('2026-11-18T12:00:00');

const STAGES = [
  { key: 'new', name: 'New', prob: 10, fill: 'var(--cerulean)', dot: 'var(--cerulean)' },
  { key: 'qualified', name: 'Qualified', prob: 25, fill: 'var(--marigold)', dot: 'var(--marigold)' },
  { key: 'proposal', name: 'Proposal', prob: 50, fill: 'var(--coral)', dot: 'var(--coral)' },
  { key: 'negotiation', name: 'Negotiation', prob: 75, fill: 'var(--ink)', dot: 'var(--ink)' },
  { key: 'won', name: 'Won', prob: 100, fill: 'var(--sea-green)', dot: 'var(--sea-green)' },
  { key: 'lost', name: 'Lost', prob: 0, fill: 'var(--sea-mist)', dot: '#9FB3B9' },
];
const OPEN_STAGES = ['new', 'qualified', 'proposal', 'negotiation'];

const DEALS = [
  { name: 'Customer portal discovery', org: 'Meridian Clinics', value: 18000, stage: 'new', prob: 10, close: '2027-02-12', who: 'JL' },
  { name: 'Fleet tracking dashboard', org: 'Oakline Freight', value: 42000, stage: 'new', prob: 10, close: '2027-03-03', who: 'MK' },
  { name: 'Security review', org: 'Solace Insurance', value: 12500, stage: 'new', prob: 10, close: '2027-01-28', who: 'PD' },
  { name: 'Inventory API pilot', org: 'Brightwater Foods', value: 9500, stage: 'new', prob: 10, close: '2027-01-20', who: 'TO' },

  { name: 'ERP integration', org: 'Ironbridge Manufacturing', value: 86000, stage: 'qualified', prob: 25, close: '2027-01-15', who: 'RS' },
  { name: 'Claims workflow automation', org: 'Solace Insurance', value: 64000, stage: 'qualified', prob: 30, close: '2027-02-02', who: 'PD' },
  { name: 'Learning platform rollout', org: 'Pinecrest Schools', value: 27500, stage: 'qualified', prob: 25, close: '2026-11-10', who: 'EW' },
  { name: 'Analytics retainer', org: 'Lumen Retail', value: 24000, stage: 'qualified', prob: 25, close: '2026-12-18', who: 'CN' },

  { name: 'Data warehouse build', org: 'Kestrel Capital', value: 148000, stage: 'proposal', prob: 50, close: '2026-12-20', who: 'HB' },
  { name: 'Mobile app phase 2', org: 'Lumen Retail', value: 71500, stage: 'proposal', prob: 50, close: '2027-01-09', who: 'CN' },
  { name: 'Robotics telemetry', org: 'Vantage Robotics', value: 55000, stage: 'proposal', prob: 60, close: '2026-12-12', who: 'YA' },
  { name: 'Website rebuild', org: 'Halcyon Studios', value: 32000, stage: 'proposal', prob: 50, close: '2026-11-04', who: 'GF' },

  { name: 'Managed cloud contract', org: 'Quarry Software', value: 118000, stage: 'negotiation', prob: 75, close: '2026-11-28', who: 'DV' },
  { name: 'Patient intake redesign', org: 'Cedar Health Group', value: 46500, stage: 'negotiation', prob: 75, close: '2026-11-12', who: 'AR' },
  { name: 'Support desk licences', org: 'Northwind Partners', value: 21000, stage: 'negotiation', prob: 80, close: '2026-12-03', who: 'LM' },

  { name: 'Route planning module', org: 'Bluefin Logistics', value: 58500, stage: 'won', prob: 100, close: '2026-11-18', who: 'SK' },
  { name: 'Compliance reporting', org: 'Tallow & Finch', value: 39000, stage: 'won', prob: 100, close: '2026-10-29', who: 'BF' },
  { name: 'POS upgrade', org: 'Brightwater Foods', value: 26000, stage: 'won', prob: 100, close: '2026-10-16', who: 'TO' },
  { name: 'Annual support renewal', org: 'Northwind Partners', value: 15000, stage: 'won', prob: 100, close: '2026-10-02', who: 'LM' },
  { name: 'Telehealth scheduling', org: 'Meridian Clinics', value: 76000, stage: 'won', prob: 100, close: '2026-09-24', who: 'JL' },

  { name: 'CRM migration', org: 'Kestrel Capital', value: 52000, stage: 'lost', prob: 0, close: '2026-11-06', who: 'HB' },
  { name: 'Warehouse sensors', org: 'Oakline Freight', value: 34000, stage: 'lost', prob: 0, close: '2026-10-21', who: 'MK' },
  { name: 'Brand refresh site', org: 'Halcyon Studios', value: 8000, stage: 'lost', prob: 0, close: '2026-09-30', who: 'GF' },
];

const MONTHS = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
const REVENUE_WON = [62000, 48500, 91000, 73500, 54000, 118000, 86500, 97000, 104000, 141000, 80000, 58500];
const WON_COUNT = [2, 1, 3, 2, 2, 3, 2, 3, 3, 4, 3, 1];
const LOST_COUNT = [1, 2, 1, 1, 0, 2, 1, 1, 2, 1, 1, 1];

const FOLLOW_UPS = [
  { group: 'Overdue', due: '12 Nov', text: 'Send revised proposal', rel: 'Website rebuild', org: 'Halcyon Studios', type: 'email' },
  { group: 'Overdue', due: '14 Nov', text: 'Call back about budget', rel: 'Emma Walsh', org: 'Pinecrest Schools', type: 'call' },
  { group: 'Overdue', due: '16 Nov', text: 'Chase signed order form', rel: 'Patient intake redesign', org: 'Cedar Health Group', type: 'email' },
  { group: 'Today', due: '18 Nov', text: 'Confirm kickoff date', rel: 'Route planning module', org: 'Bluefin Logistics', type: 'call' },
  { group: 'Today', due: '18 Nov', text: 'Share fintech case study', rel: 'Hana Brooks', org: 'Kestrel Capital', type: 'email' },
  { group: 'Upcoming', due: '19 Nov', text: 'Demo for the finance team', rel: 'Claims workflow automation', org: 'Solace Insurance', type: 'call' },
  { group: 'Upcoming', due: '21 Nov', text: 'Send contract redlines', rel: 'Managed cloud contract', org: 'Quarry Software', type: 'email' },
  { group: 'Upcoming', due: '24 Nov', text: 'Intro call with ops lead', rel: 'Fleet tracking dashboard', org: 'Oakline Freight', type: 'call' },
];

const RECENT = [
  { kind: 'stage', from: 'Negotiation', to: 'Won', rel: 'Route planning module', org: 'Bluefin Logistics', when: '2 hours ago' },
  { kind: 'call', text: 'Agreed final pricing. Legal is reviewing the contract.', rel: 'Daniel Vos', org: 'Quarry Software', when: '4 hours ago' },
  { kind: 'email', text: 'Sent data warehouse proposal, version 2.', rel: 'Hana Brooks', org: 'Kestrel Capital', when: 'Yesterday' },
  { kind: 'stage', from: 'Proposal', to: 'Negotiation', rel: 'Managed cloud contract', org: 'Quarry Software', when: 'Yesterday' },
  { kind: 'note', text: 'Procurement wants a second reference before signing.', rel: 'Patient intake redesign', org: 'Cedar Health Group', when: '2 days ago' },
  { kind: 'call', text: 'Scoped claims automation. Three teams involved.', rel: 'Priya Desai', org: 'Solace Insurance', when: '2 days ago' },
  { kind: 'stage', from: 'Negotiation', to: 'Lost', rel: 'CRM migration', org: 'Kestrel Capital', when: '12 Nov' },
];

// ---- Derived figures -------------------------------------------------------
const sum = (a) => a.reduce((s, v) => s + v, 0);
const openDeals = DEALS.filter((d) => OPEN_STAGES.includes(d.stage));
const FIG = {
  revenueWon12: sum(REVENUE_WON),
  openValue: sum(openDeals.map((d) => d.value)),
  expected: sum(openDeals.map((d) => (d.value * d.prob) / 100)),
  openCount: openDeals.length,
  wonCount12: sum(WON_COUNT),
  lostCount12: sum(LOST_COUNT),
  winRate: sum(WON_COUNT) / (sum(WON_COUNT) + sum(LOST_COUNT)),
  lateCount: openDeals.filter(isLate).length,
  overdueCount: FOLLOW_UPS.filter((f) => f.group === 'Overdue').length,
};

// Value that reached each stage (history based, see spec concern 6).
const FUNNEL = (() => {
  const openAt = (k) => sum(openDeals.filter((d) => d.stage === k).map((d) => d.value));
  const lostAfter = { negotiation: 140000, proposal: 96000, qualified: 88000, new: 60000 };
  const won = FIG.revenueWon12;
  const negotiation = won + openAt('negotiation') + lostAfter.negotiation;
  const proposal = negotiation + openAt('proposal') + lostAfter.proposal;
  const qualified = proposal + openAt('qualified') + lostAfter.qualified;
  const nw = qualified + openAt('new') + lostAfter.new;
  return {
    rows: [
      { key: 'new', value: nw, count: 78 },
      { key: 'qualified', value: qualified, count: 64 },
      { key: 'proposal', value: proposal, count: 51 },
      { key: 'negotiation', value: negotiation, count: 41 },
      { key: 'won', value: won, count: 29 },
    ],
    lost: sum(Object.values(lostAfter)),
    lostCount: 14,
  };
})();

// ---- Helpers ---------------------------------------------------------------
function isLate(d) {
  return OPEN_STAGES.includes(d.stage) && new Date(d.close + 'T00:00:00') < new Date('2026-11-18T00:00:00');
}
const stageOf = (k) => STAGES.find((s) => s.key === k);
const usd = (v) => '$' + Math.round(v).toLocaleString('en-US');
const usdShort = (v) => (v >= 1e6 ? '$' + (v / 1e6).toFixed(2).replace(/0$/, '') + 'M' : v >= 1000 ? '$' + Math.round(v / 1000) + 'k' : '$' + v);
const fmtDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1];
  return `${d} ${mon}` + (y === 2026 ? '' : ` ${y}`);
};
const dealsIn = (k) => DEALS.filter((d) => d.stage === k);
const colTotals = (k) => {
  const ds = dealsIn(k);
  return { count: ds.length, value: sum(ds.map((d) => d.value)), expected: sum(ds.map((d) => (d.value * d.prob) / 100)) };
};

// ---- Icons (Lucide paths) --------------------------------------------------
const ICONS = {
  dashboard: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  pipeline: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 7v7"/><path d="M12 7v4"/><path d="M16 7v9"/>',
  deals: '<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  contacts: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  orgs: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  call: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  email: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  note: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8M16 17H8M10 9H8"/>',
  stage: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  grip: '<circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/>',
  filter: '<path d="M3 6h18M7 12h10M10 18h4"/>',
};
const icon = (name, size = 18, sw = 2) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

// ---- Charts ----------------------------------------------------------------
function niceMax(max, ticks = 4) {
  const raw = max / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  return { max: step * ticks, step };
}

function smoothPath(pts) {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

// Line chart with area fill. opts: values, labels, width, height, stroke, fill, grid, text, dotFill
function lineChart(o) {
  const W = o.width, H = o.height, P = { l: 52, r: 20, t: 18, b: 30 };
  const { max, step } = niceMax(Math.max(...o.values));
  const x = (i) => P.l + (i * (W - P.l - P.r)) / (o.values.length - 1);
  const y = (v) => P.t + (1 - v / max) * (H - P.t - P.b);
  const pts = o.values.map((v, i) => [x(i), y(v)]);
  const id = 'g' + Math.random().toString(36).slice(2, 8);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${o.label || 'Line chart'}">`;
  s += `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.fill}" stop-opacity="${o.fillOpacity ?? 0.35}"/><stop offset="1" stop-color="${o.fill}" stop-opacity="0"/></linearGradient></defs>`;
  for (let v = 0; v <= max; v += step) {
    s += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" stroke="${o.grid}" stroke-dasharray="${v === 0 ? '0' : '3 5'}"/>`;
    s += `<text x="${P.l - 10}" y="${y(v) + 4}" text-anchor="end" font-family="var(--font-mono)" font-size="11" fill="${o.text}">${usdShort(v)}</text>`;
  }
  o.labels.forEach((l, i) => {
    s += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="${o.text}">${l}</text>`;
  });
  const line = smoothPath(pts);
  s += `<path d="${line} L${x(o.values.length - 1)},${y(0)} L${x(0)},${y(0)} Z" fill="url(#${id})"/>`;
  s += `<path d="${line}" fill="none" stroke="${o.stroke}" stroke-width="2.5" stroke-linecap="round"/>`;
  pts.forEach((p, i) => {
    const last = i === pts.length - 1;
    s += `<circle cx="${p[0]}" cy="${p[1]}" r="${last ? 5 : 3}" fill="${o.dotFill}" stroke="${o.stroke}" stroke-width="2"/>`;
  });
  if (o.callout != null) {
    const i = o.callout, p = pts[i];
    const label = usd(o.values[i]);
    const bw = label.length * 7.6 + 18;
    s += `<g transform="translate(${Math.min(p[0] - bw / 2, W - P.r - bw)},${p[1] - 38})"><rect width="${bw}" height="24" rx="8" fill="${o.calloutBg}"/><text x="${bw / 2}" y="16" text-anchor="middle" font-family="var(--font-mono)" font-size="12" font-weight="600" fill="${o.calloutText}">${label}</text></g>`;
  }
  return s + '</svg>';
}

// Grouped bars (or mirrored: second series drawn below the axis).
function barChart(o) {
  const W = o.width, H = o.height, P = { l: 36, r: 12, t: o.mirrored ? 24 : 14, b: 30 };
  const all = o.mirrored ? [Math.max(...o.series[0].values), Math.max(...o.series[1].values)] : [Math.max(...o.series.flatMap((s) => s.values))];
  const { max, step } = niceMax(Math.max(...all), o.mirrored ? 2 : 4);
  const n = o.labels.length, slot = (W - P.l - P.r) / n;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${o.label || 'Bar chart'}">`;
  if (!o.mirrored) {
    const y = (v) => P.t + (1 - v / max) * (H - P.t - P.b);
    for (let v = 0; v <= max; v += step) {
      s += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" stroke="${o.grid}" stroke-dasharray="${v === 0 ? '0' : '3 5'}"/>`;
      s += `<text x="${P.l - 8}" y="${y(v) + 4}" text-anchor="end" font-family="var(--font-mono)" font-size="11" fill="${o.text}">${v}</text>`;
    }
    const bw = Math.min(14, (slot - 10) / o.series.length);
    o.labels.forEach((l, i) => {
      const cx = P.l + slot * i + slot / 2;
      o.series.forEach((se, k) => {
        const bx = cx - (bw * o.series.length + 3 * (o.series.length - 1)) / 2 + k * (bw + 3);
        const v = se.values[i], top = y(v);
        if (v > 0) s += `<rect x="${bx}" y="${top}" width="${bw}" height="${y(0) - top}" rx="4" fill="${se.color}"/>`;
      });
      s += `<text x="${cx}" y="${H - 8}" text-anchor="middle" font-size="11" fill="${o.text}">${l}</text>`;
    });
  } else {
    const mid = P.t + (H - P.t - P.b) * 0.62;
    const upH = mid - P.t, downH = H - P.b - mid - 6;
    const bw = Math.min(18, slot - 12);
    s += `<line x1="${P.l}" x2="${W - P.r}" y1="${mid}" y2="${mid}" stroke="${o.grid}"/>`;
    o.labels.forEach((l, i) => {
      const cx = P.l + slot * i + slot / 2;
      const w = o.series[0].values[i], lo = o.series[1].values[i];
      const hu = (w / max) * upH, hd = (lo / max) * upH;
      if (w) s += `<rect x="${cx - bw / 2}" y="${mid - hu - 2}" width="${bw}" height="${hu}" rx="4" fill="${o.series[0].color}"/><text x="${cx}" y="${mid - hu - 8}" text-anchor="middle" font-family="var(--font-mono)" font-size="10.5" fill="${o.text}">${w}</text>`;
      if (lo) s += `<rect x="${cx - bw / 2}" y="${mid + 2}" width="${bw}" height="${Math.min(hd, downH)}" rx="4" fill="${o.series[1].color}"/>`;
      s += `<text x="${cx}" y="${H - 8}" text-anchor="middle" font-size="11" fill="${o.text}">${l}</text>`;
    });
  }
  return s + '</svg>';
}
