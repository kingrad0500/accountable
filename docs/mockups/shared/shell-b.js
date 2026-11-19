// Direction B shell: floating top bar with tabs, search and the main action.
function shellB(active, action = 'Add deal') {
  const links = [['dashboard', 'Dashboard'], ['pipeline', 'Pipeline'], ['deals', 'Deals'], ['contacts', 'Contacts'], ['orgs', 'Organizations']];
  return `
  <header class="b-top panel">
    <div class="b-brand"><span class="b-mark">A</span>Accountable</div>
    <nav class="b-tabs" aria-label="Main">
      ${links.map(([k, l]) => `<a href="#" class="${k === active ? 'on' : ''}" ${k === active ? 'aria-current="page"' : ''}>${icon(k, 16)}${l}</a>`).join('')}
    </nav>
    <div class="b-right">
      <label class="b-search">${icon('search', 16)}<input placeholder="Search deals, contacts, organizations" aria-label="Search"></label>
      <button class="btn btn-primary">${icon('plus', 16, 2.5)} ${action}</button>
    </div>
  </header>`;
}

const SHELL_B_CSS = `
  .b-page { max-width: 1400px; margin: 0 auto; padding: 16px 24px 40px; }
  .b-top { display: flex; align-items: center; gap: 24px; padding: 10px 12px 10px 18px; margin-bottom: 22px; }
  .b-brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 17px; letter-spacing: -0.01em; }
  .b-mark { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; background: var(--ink); color: var(--sea-green); font-family: var(--font-serif); font-size: 21px; font-weight: 400; }
  .b-tabs { display: flex; gap: 2px; background: var(--bg); padding: 4px; border-radius: 12px; }
  .b-tabs a { display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 14px; border-radius: 9px; font-weight: 500; color: var(--ink-muted); }
  .b-tabs a.on { background: var(--panel); color: var(--ink); font-weight: 600; box-shadow: var(--shadow); }
  .b-right { margin-left: auto; display: flex; align-items: center; gap: 10px; }
  .b-search { display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 12px; border-radius: 10px; background: var(--bg); color: var(--ink-muted); width: 300px; }
  .b-search input { border: 0; background: transparent; outline: none; width: 100%; font-size: 13.5px; color: var(--ink); }
  .b-search input::placeholder { color: var(--ink-muted); }
  .b-title { display: flex; align-items: baseline; justify-content: space-between; margin: 0 4px 16px; }
  .b-title h1 { font-size: 26px; font-weight: 600; letter-spacing: -0.02em; }
  .b-title .muted { font-size: 13.5px; }
`;
