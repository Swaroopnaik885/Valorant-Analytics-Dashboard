import { getMatches, MODES, RANGES, SORTS, MAP_NAMES, AGENT_NAMES } from '../data.js';
import { getFilters, setFilters } from '../filters.js';
import { esc, pct, shortDate } from '../utils.js';
import { pageHeader, bindFilters, emptyState, optionList, modeOptions, rangeOptions, rrText, rrClass, searchIcon } from '../ui.js';

const PAGE_SIZE = 7;
const sorters = {
  recent: (a, b) => b.ts - a.ts,
  oldest: (a, b) => a.ts - b.ts,
  acs: (a, b) => b.player.acs - a.player.acs || b.ts - a.ts,
  kd: (a, b) => b.player.kd_ratio - a.player.kd_ratio || b.ts - a.ts,
  rr: (a, b) => b.rank.rr_change - a.rank.rr_change || b.ts - a.ts,
};

// Page-local state survives global-filter re-renders (but resets on a fresh visit via `reset`).
const local = { result: 'all', map: 'all', agent: 'all', search: '', sort: 'recent', visible: PAGE_SIZE };

export function resetLocal() {
  Object.assign(local, { result: 'all', map: 'all', agent: 'all', search: '', sort: 'recent', visible: PAGE_SIZE });
}

function apply(ms) {
  const q = local.search.trim().toLowerCase();
  return ms
    .filter((m) => local.result === 'all' || m.result === local.result)
    .filter((m) => local.map === 'all' || m.mapName === local.map)
    .filter((m) => local.agent === 'all' || m.agent === local.agent)
    .filter((m) => !q || `${m.mapName} ${m.agent} ${m.role} ${m.mode}`.toLowerCase().includes(q))
    .sort(sorters[local.sort]);
}

function rowHtml(m) {
  const kda = `${m.player.kills} / ${m.player.deaths} / ${m.player.assists}`;
  const rr = m.rank.rr_change;
  return `
    <li>
      <div class="row row--history ${m.win ? '' : 'row--loss'}">
        <div class="row__main">
          <span class="row__result">${m.win ? 'Victory' : 'Defeat'}</span>
          <strong class="row__ellipsis">${esc(m.mapName)}</strong>
        </div>
        <span class="row__agent row__ellipsis">${esc(m.agent)}</span>
        <span class="row__kda">${kda}</span>
        <span class="row__acs"><span class="visually-hidden">ACS </span>${m.player.acs}</span>
        <span class="row__meta"><span class="visually-hidden">Headshots </span>${pct(m.player.headshot_rate, 0)}</span>
        <span class="row__meta ${rrClass(rr)}">${rrText(rr)}</span>
        <span class="row__date">${esc(shortDate(m.played_at_local))}</span>
        <a class="btn btn--ghost" href="#/match/${esc(m.match_id)}" aria-label="View details: ${esc(m.mapName)} on ${esc(shortDate(m.played_at_local))}">View details ↗</a>
        <span class="row__summary">${kda} · ${m.player.acs} ACS · ${pct(m.player.headshot_rate, 0)} HS · <span class="${rrClass(rr)}">${rrText(rr)}</span> · ${esc(shortDate(m.played_at_local))}</span>
      </div>
    </li>`;
}

export function render(root) {
  const f = getFilters();
  const base = getMatches(f);

  root.innerHTML = `
    ${pageHeader({ title: 'Match History', subtitle: `Search, filter and review every ${f.mode === 'all' ? '' : `${f.mode.toLowerCase()} `}game`, subtitleShort: 'Search, filter and review games' })}
    <div class="stack">
      <p class="label" id="found" role="status" aria-live="polite"></p>
      <form class="toolbar" role="search" aria-label="Match filters" id="history-filters">
        <label class="chip"><span class="visually-hidden">Game mode</span>
          <select class="chip__select" id="h-mode" data-filter="mode">${modeOptions(f.mode)}</select></label>
        <label class="chip"><span class="visually-hidden">Result</span>
          <select class="chip__select chip__select--muted" id="h-result" data-local="result">${optionList([['all', 'All results'], ['win', 'Victories'], ['loss', 'Defeats']], local.result)}</select></label>
        <label class="chip"><span class="visually-hidden">Map</span>
          <select class="chip__select chip__select--muted" id="h-map" data-local="map">${optionList([['all', 'All maps'], ...MAP_NAMES.map((n) => [n, n])], local.map)}</select></label>
        <label class="chip"><span class="visually-hidden">Agent</span>
          <select class="chip__select chip__select--muted" id="h-agent" data-local="agent">${optionList([['all', 'All agents'], ...AGENT_NAMES.map((n) => [n, n])], local.agent)}</select></label>
        <label class="chip"><span class="visually-hidden">Date range</span>
          <select class="chip__select chip__select--muted" id="h-range" data-filter="range">${rangeOptions(f.range)}</select></label>
        <label class="search"><span class="visually-hidden">Search maps and agents</span>
          <span class="search__icon">${searchIcon}</span>
          <input class="search__input" id="h-search" type="search" placeholder="Search maps, agents…" value="${esc(local.search)}" autocomplete="off"></label>
        <label class="chip"><span class="visually-hidden">Sort order</span>
          <select class="chip__select chip__select--muted" id="h-sort" data-local="sort">${optionList(Object.entries(SORTS), local.sort)}</select></label>
      </form>

      <section class="card" aria-label="Matches">
        <div id="list"></div>
      </section>
    </div>`;

  const listEl = root.querySelector('#list');
  const foundEl = root.querySelector('#found');

  function paint() {
    const all = apply(base);
    const shown = all.slice(0, local.visible);
    foundEl.textContent = `${all.length} ${all.length === 1 ? 'match' : 'matches'} found`;

    if (!all.length) {
      listEl.innerHTML = emptyState({
        text: base.length
          ? 'No matches fit these filters. Clear the search and filters to see them again.'
          : `There are no ${MODES[f.mode].toLowerCase()} matches in the ${RANGES[f.range].phrase}.`,
        actions: '<button type="button" class="btn" data-action="clear">Reset filters</button>',
      });
      listEl.querySelector('[data-action="clear"]').addEventListener('click', () => {
        const alreadyAll = f.mode === 'all' && f.range === 'all';
        resetLocal();
        setFilters({ mode: 'all', range: 'all' });
        if (alreadyAll) render(root); // no filter change event fires, so repaint explicitly
      });
      return;
    }

    listEl.innerHTML = `
      <ul class="rows">${shown.map(rowHtml).join('')}</ul>
      <div class="list-foot">
        <p class="label">Showing ${shown.length} of ${all.length} matches</p>
        ${shown.length < all.length ? '<button type="button" class="btn" id="load-more">Load more</button>' : ''}
      </div>`;

    listEl.querySelector('#load-more')?.addEventListener('click', () => {
      local.visible += PAGE_SIZE;
      paint();
      // Keep keyboard users in the list: focus the first newly added row's button.
      listEl.querySelectorAll('.rows > li')[shown.length]?.querySelector('a')?.focus();
    });
  }

  root.querySelectorAll('[data-local]').forEach((el) => {
    el.addEventListener('change', () => { local[el.dataset.local] = el.value; local.visible = PAGE_SIZE; paint(); });
  });
  root.querySelector('#h-search').addEventListener('input', (e) => { local.search = e.target.value; local.visible = PAGE_SIZE; paint(); });
  root.querySelector('#history-filters').addEventListener('submit', (e) => e.preventDefault());

  bindFilters(root);
  paint();
}

/** Called by the router when the user navigates here (not on filter re-renders). */
export const enter = resetLocal;
