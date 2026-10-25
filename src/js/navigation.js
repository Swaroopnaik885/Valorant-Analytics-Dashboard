/*
 * Hash router + sidebar/drawer behaviour.
 * Routes: #/overview, #/history, #/analytics, #/agents, #/weapons, #/maps, #/settings, #/match/<id>
 */
import { subscribe, getProfile } from './filters.js';
import { currentRank } from './data.js';
import { initials } from './utils.js';
import { destroyAllCharts } from './charts.js';

import * as overview from './pages/overview.js';
import * as history from './pages/history.js';
import * as performance from './pages/performance.js';
import * as agents from './pages/agents.js';
import * as weapons from './pages/weapons.js';
import * as maps from './pages/maps.js';
import * as match from './pages/match.js';
import * as settings from './pages/settings.js';

const ROUTES = {
  overview: { page: overview, title: 'Overview', nav: 'overview' },
  history: { page: history, title: 'Match History', nav: 'history' },
  analytics: { page: performance, title: 'Performance Analytics', nav: 'analytics' },
  agents: { page: agents, title: 'Agent Statistics', nav: 'agents' },
  weapons: { page: weapons, title: 'Weapon Analytics', nav: 'weapons' },
  maps: { page: maps, title: 'Maps & Rounds', nav: 'maps' },
  match: { page: match, title: 'Match Details', nav: 'history' },
  settings: { page: settings, title: 'Profile & Settings', nav: 'settings' },
};

const outlet = () => document.getElementById('main');
let currentPath = null;

function parseHash() {
  const [key = 'overview', ...params] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  return { key: ROUTES[key] ? key : 'overview', params };
}

/** Render the page for the current URL. `keepScroll` is used when only a filter changed. */
function render({ keepScroll = false } = {}) {
  const { key, params } = parseHash();
  const route = ROUTES[key];
  const path = `${key}/${params.join('/')}`;
  const changedPage = path !== currentPath;
  const focusId = keepScroll ? document.activeElement?.id : null;
  const scrollY = window.scrollY;

  destroyAllCharts();
  if (changedPage) route.page.enter?.();

  const host = outlet();
  const page = document.createElement('div');
  page.className = 'page';
  page.dataset.page = key;
  host.replaceChildren(page);

  try {
    route.page.render(page, { params });
  } catch (err) {
    console.error(err);
    page.innerHTML = '<div class="empty" role="alert"><strong>Something went wrong</strong><p>This page could not be displayed. Try another section or reload.</p></div>';
  }

  document.title = `${route.title} · Vanta`;
  updateNav(route.nav);
  currentPath = path;

  if (keepScroll) {
    window.scrollTo(0, scrollY);
    if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
  } else {
    window.scrollTo(0, 0);
    // Move focus to the new page heading so keyboard + screen-reader users know the view changed.
    page.querySelector('#page-title')?.focus({ preventScroll: true });
  }
}

function updateNav(active) {
  document.querySelectorAll('[data-nav]').forEach((link) => {
    if (link.dataset.nav === active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

/** Fill the sidebar + top bar player info. */
export function paintPlayer() {
  const p = getProfile();
  const rank = currentRank();
  document.querySelectorAll('[data-player-initials]').forEach((el) => { el.textContent = initials(p.name); });
  document.querySelectorAll('[data-player-name]').forEach((el) => { el.textContent = p.full; });
  document.querySelectorAll('[data-player-rank]').forEach((el) => { el.textContent = rank.tier; });
}

/* ---------- Mobile drawer ---------- */
function initDrawer() {
  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('scrim');
  const button = document.getElementById('menu-button');
  const mq = window.matchMedia('(max-width: 1023px)');

  const isOpen = () => sidebar.classList.contains('is-open');

  // On narrow screens the closed drawer must not be reachable by keyboard.
  const syncInert = () => { sidebar.inert = mq.matches && !isOpen(); };

  function setOpen(open) {
    sidebar.classList.toggle('is-open', open);
    scrim.classList.toggle('is-open', open);
    document.body.classList.toggle('is-locked', open && mq.matches);
    button.setAttribute('aria-expanded', String(open));
    syncInert(); // must happen before focusing: inert elements cannot take focus
    if (open) sidebar.querySelector('.nav__link[aria-current="page"], .nav__link')?.focus();
    else if (mq.matches) button.focus();
  }

  mq.addEventListener('change', () => { if (!mq.matches) setOpen(false); syncInert(); });
  syncInert();

  button.addEventListener('click', () => setOpen(!isOpen()));
  scrim.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) setOpen(false); });
  sidebar.addEventListener('click', (e) => { if (e.target.closest('a') && mq.matches) setOpen(false); });

  // Keep Tab inside the open drawer.
  sidebar.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !isOpen()) return;
    const items = [...sidebar.querySelectorAll('a[href]')];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

export function initRouter() {
  initDrawer();
  paintPlayer();
  window.addEventListener('hashchange', () => render());
  subscribe(() => { paintPlayer(); render({ keepScroll: true }); });
  render();
}

