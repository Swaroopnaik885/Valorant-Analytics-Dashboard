import { esc, ICONS } from './utils.js';
import { MODES, RANGES } from './data.js';
import { getFilters, setFilters } from './filters.js';
import { splitDelta } from './analytics.js';

export const optionList = (entries, selected) =>
  entries
    .map(([value, label]) => `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(label)}</option>`)
    .join('');

export const modeOptions = (selected) => optionList(Object.entries(MODES), selected);
export const rangeOptions = (selected) => optionList(Object.entries(RANGES).map(([k, v]) => [k, v.label]), selected);

export function pageHeader({ title, subtitle, subtitleShort, crumbs = ['Vanta', 'Analytics'] }) {
  const f = getFilters();
  return `
    <header class="page-head">
      <div class="page-head__text">
        <p class="crumbs">${crumbs.map((c) => `<span>${esc(c)}</span>`).join('')}</p>
        <h1 class="page-title" id="page-title" tabindex="-1">${esc(title)}</h1>
        <p class="page-sub page-sub--long">${esc(subtitle)}</p>
        <p class="page-sub page-sub--short">${esc(subtitleShort ?? subtitle)}</p>
      </div>
      <div class="page-head__filters" role="group" aria-label="Filters">
        <label class="chip"><span class="visually-hidden">Game mode</span>
          <select class="chip__select" id="f-mode" data-filter="mode">${modeOptions(f.mode)}</select></label>
        <label class="chip"><span class="visually-hidden">Date range</span>
          <select class="chip__select chip__select--muted" id="f-range" data-filter="range">${rangeOptions(f.range)}</select></label>
      </div>
    </header>`;
}

export function bindFilters(root) {
  root.querySelectorAll('select[data-filter]').forEach((select) => {
    select.addEventListener('change', () => setFilters({ [select.dataset.filter]: select.value }));
  });
}

export function kpi({ label, value, delta }) {
  return `
    <div class="kpi">
      <span class="label">${esc(label)}</span>
      <span class="kpi__value">${esc(value)}</span>
      ${delta ? `<span class="kpi__delta ${delta.cls}">${esc(delta.text)}</span>` : ''}
    </div>`;
}

export function deltaInfo(ms, metric, { scale = 1, digits = 2, unit = '', label = 'vs earlier' } = {}) {
  const d = splitDelta(ms, metric);
  if (d === null) return { text: `– ${label}`, cls: 'is-muted' };
  const v = d * scale;
  if (Math.abs(v) < 0.5 * 10 ** -digits) return { text: `→ no change ${label}`, cls: 'is-flat' };
  return { text: `${v > 0 ? '↑' : '↓'} ${Math.abs(v).toFixed(digits)}${unit} ${label}`, cls: v > 0 ? 'is-up' : 'is-down' };
}

export function chartCard({ id, title, subtitle, aria, axis, tall = false, legendHtml = '', className = '' }) {
  return `
    <section class="card chart-card ${className}" aria-labelledby="${id}-title">
      <h2 class="card__title" id="${id}-title">${esc(title)}</h2>
      ${subtitle ? `<p class="card__sub">${esc(subtitle)}</p>` : ''}
      ${legendHtml}
      <div class="chart-box${tall ? ' chart-box--tall' : ''}"><canvas id="${id}" role="img" aria-label="${esc(aria ?? title)}"></canvas></div>
      ${axis ? `<p class="axis-caption">${esc(axis)}</p>` : ''}
    </section>`;
}

export function emptyState({ title = 'No matches found', text, actions = '' }) {
  return `
    <div class="empty" role="status">
      <strong>${esc(title)}</strong>
      <p>${esc(text)}</p>
      ${actions}
    </div>`;
}

export const showAllButton = '<button type="button" class="btn" data-action="show-all">Show all matches</button>';

export function bindEmptyActions(root) {
  root.querySelector('[data-action="show-all"]')?.addEventListener('click', () => setFilters({ mode: 'all', range: 'all' }));
}

export const searchIcon = ICONS.search;

const ROLE_TINT = {
  Duelist: { bg: '#38272F', fg: 'var(--accent-red)' },
  Controller: { bg: '#202D3A', fg: 'var(--accent-cyan)' },
  Initiator: { bg: '#253A37', fg: 'var(--success)' },
  Sentinel: { bg: '#333044', fg: 'var(--accent-blue)' },
};

export function agentTint(role) {
  return ROLE_TINT[role] ?? { bg: '#26323A', fg: 'var(--accent-cyan)' };
}

export const agentLetter = (name) => esc(String(name).charAt(0).toUpperCase());

export const rrText = (rr) => `${rr > 0 ? '+' : rr < 0 ? '−' : '±'}${Math.abs(rr)} RR`;
export const rrClass = (rr) => (rr > 0 ? 'is-up' : rr < 0 ? 'is-down' : 'is-muted');
