// Direction C shell: floating white sidebar, serif wordmark, calm and airy.
function shellC(active) {
  const links = [['dashboard', 'Dashboard'], ['pipeline', 'Pipeline'], ['deals', 'Deals'], ['contacts', 'Contacts'], ['orgs', 'Organizations']];
  return `
  <aside class="c-side panel">
    <div class="c-brand">Accountable</div>
    <label class="c-search">${icon('search', 15)}<span>Search</span><kbd>/</kbd></label>
    <nav aria-label="Main">
      ${links.map(([k, l]) => `<a href="#" class="${k === active ? 'on' : ''}" ${k === active ? 'aria-current="page"' : ''}><span class="ic">${icon(k, 17)}</span>${l}</a>`).join('')}
    </nav>
    <div class="c-quick">
      <span>Quick add</span>
      <a href="#">${icon('plus', 14, 2.5)} Deal</a>
      <a href="#">${icon('plus', 14, 2.5)} Contact</a>
      <a href="#">${icon('plus', 14, 2.5)} Organization</a>
    </div>
  </aside>`;
}

const SHELL_C_CSS = `
  .c-wrap { display: grid; grid-template-columns: 236px 1fr; gap: 28px; padding: 16px 32px 40px 16px; min-height: 100vh; }
  .c-side { padding: 22px 14px; display: flex; flex-direction: column; gap: 18px; border-radius: 20px; align-self: stretch; }
  .c-brand { font-family: var(--font-serif); font-size: 30px; line-height: 1; padding: 0 8px; letter-spacing: -0.01em; }
  .c-search { display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 10px; background: var(--bg); border-radius: 10px; color: var(--ink-muted); font-size: 13px; }
  .c-search kbd { margin-left: auto; font-family: var(--font-mono); font-size: 11px; background: var(--panel); border-radius: 5px; padding: 0 6px; }
  .c-side nav { display: flex; flex-direction: column; gap: 2px; }
  .c-side nav a { display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 8px; border-radius: 10px; font-weight: 500; color: var(--ink-muted); }
  .c-side nav a .ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; }
  .c-side nav a.on { color: var(--ink); font-weight: 600; background: var(--bg); }
  .c-side nav a.on .ic { background: var(--ink); color: var(--sea-green); }
  .c-quick { margin-top: auto; display: flex; flex-direction: column; gap: 2px; padding: 12px 8px 0; }
  .c-quick span { font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-muted); margin-bottom: 6px; }
  .c-quick a { display: flex; align-items: center; gap: 8px; height: 30px; font-size: 13px; font-weight: 500; color: var(--sea-green-ink); }
  .c-main { min-width: 0; padding-top: 14px; }
  .c-eyebrow { font-family: var(--font-serif); font-style: italic; font-size: 22px; color: var(--ink-muted); }
  .c-h1 { font-size: 34px; font-weight: 600; letter-spacing: -0.025em; line-height: 1.1; }
`;
