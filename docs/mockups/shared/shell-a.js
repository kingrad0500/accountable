// Direction A shell: Midnight sidebar, as described in docs/spec.md.
function shellA(active) {
  const links = [
    ['dashboard', 'Dashboard'], ['pipeline', 'Pipeline'], ['deals', 'Deals'], ['contacts', 'Contacts'], ['orgs', 'Organizations'],
  ];
  return `
  <aside class="a-side">
    <div class="a-brand">
      <span class="a-mark">${icon('check', 16, 3)}</span>
      <span>Accountable</span>
    </div>
    <nav aria-label="Main">
      ${links.map(([k, l]) => `<a href="#" class="a-link ${k === active ? 'on' : ''}" ${k === active ? 'aria-current="page"' : ''}>${icon(k, 18)}<span>${l}</span></a>`).join('')}
    </nav>
    <div class="a-foot">
      <span class="avatar" style="background:#0B4E63;color:var(--sea-mist)">RA</span>
      <div><div style="color:#fff;font-weight:600;font-size:13px">Sales</div><div style="font-size:12px">Local workspace</div></div>
    </div>
  </aside>`;
}

const SHELL_A_CSS = `
  .a-wrap { display: grid; grid-template-columns: 232px 1fr; min-height: 100vh; }
  .a-side { background: var(--ink); color: var(--sea-mist); padding: 24px 16px; display: flex; flex-direction: column; gap: 28px; }
  .a-brand { display: flex; align-items: center; gap: 10px; color: #fff; font-weight: 700; font-size: 18px; padding: 0 8px; letter-spacing: -0.01em; }
  .a-mark { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; background: var(--sea-green); color: var(--ink); }
  .a-side nav { display: flex; flex-direction: column; gap: 4px; }
  .a-link { display: flex; align-items: center; gap: 12px; height: 40px; padding: 0 12px; border-radius: 10px; font-weight: 500; }
  .a-link:hover { background: rgb(205 216 219 / 0.08); color: #fff; }
  .a-link.on { background: var(--sea-green); color: var(--ink); font-weight: 600; }
  .a-foot { margin-top: auto; display: flex; gap: 10px; align-items: center; padding: 12px 8px 0; }
  .a-main { padding: 28px 32px 40px; min-width: 0; }
  .a-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
  .a-head h1 { font-size: 28px; font-weight: 600; letter-spacing: -0.02em; line-height: 1.1; }
  .a-date { font-family: var(--font-serif); font-size: 20px; color: var(--ink-muted); margin-top: 4px; }
`;
