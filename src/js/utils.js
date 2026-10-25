const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ENTITIES[c]);

export const pct = (fraction, digits = 1) => `${(fraction * 100).toFixed(digits)}%`;
export const fixed = (value, digits = 2) => Number(value).toFixed(digits);
export const signed = (value, suffix = '') => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value)}${suffix}`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function shortDate(local) {
  const [, m, d] = local.slice(0, 10).split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

export function longDate(local) {
  const [y, m, d] = local.slice(0, 10).split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export const initials = (name) => (String(name).replace(/[^A-Za-z0-9]/g, '').slice(0, 2) || '??').toUpperCase();

export const ICONS = {
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  search: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><circle cx="5" cy="5" r="3.6"/><path d="M8 8l3 3"/></svg>',
};

let toastTimer;

export function toast(message) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.append(el);
  }
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
}
