import { getMatches, RANGES, MODES } from '../data.js';
import { getFilters, getPrefs } from '../filters.js';
import { byMap, sideRates, roundOutcomes, siteStats } from '../analytics.js';
import { esc, pct } from '../utils.js';
import { pageHeader, bindFilters, kpi, chartCard, emptyState, showAllButton, bindEmptyActions, optionList } from '../ui.js';
import { barChart, dotChart, palette } from '../charts.js';

const local = { map: null };
export const enter = () => { local.map = null; };

const OUTCOME_COLOR = { defuse: 'var(--success)', plant: 'var(--accent-cyan)', clean: 'var(--accent-blue)', loss: 'var(--failed)' };

function ptsDelta(value, baseline, label) {
  const d = (value - baseline) * 100;
  if (Math.abs(d) < 0.05) return { text: `→ same as ${label}`, cls: 'is-flat' };
  return { text: `${d > 0 ? '↑' : '↓'} ${Math.abs(d).toFixed(1)} pts vs ${label}`, cls: d > 0 ? 'is-up' : 'is-down' };
}

export function render(root) {
  const f = getFilters();
  const ms = getMatches(f);
  const header = pageHeader({ title: 'Maps & Rounds', subtitle: 'Map advantages and round-winning patterns', subtitleShort: 'Map and round patterns' });

  if (!ms.length) {
    root.innerHTML = header + emptyState({ text: `There are no ${f.mode === 'all' ? '' : `${MODES[f.mode].toLowerCase()} `}matches in the ${RANGES[f.range].phrase}.`, actions: showAllButton });
    bindFilters(root); bindEmptyActions(root);
    return;
  }

  const maps = byMap(ms);
  const mostPlayed = [...maps].sort((a, b) => b.matches - a.matches || a.map.localeCompare(b.map))[0];
  if (!maps.some((m) => m.map === local.map)) local.map = mostPlayed.map;
  const current = maps.find((m) => m.map === local.map);
  const onMap = ms.filter((m) => m.mapName === local.map);
  const overallSides = sideRates(ms);
  const outcomes = roundOutcomes(onMap);
  const sites = siteStats(onMap);
  const siteLine = (s) => (s.n ? `${pct(s.won / s.n, 0)} · ${s.n} rounds` : 'No rounds');

  const outcomeRows = outcomes.rows.map((r) => `
    <div class="bar-row">
      <span class="bar-row__label">${esc(r.label)}</span>
      <span class="track" aria-hidden="true"><i style="width:${(r.share * 100).toFixed(1)}%;background:${OUTCOME_COLOR[r.key]}"></i></span>
      <span class="bar-row__pct">${pct(r.share, 0)}</span>
    </div>`).join('');

  const prefs = getPrefs();
  root.innerHTML = `
    ${header}
    <div class="stack">
      <div class="toolbar">
        <label class="label" for="m-map">Map</label>
        <label class="chip"><span class="visually-hidden">Map</span>
          <select class="chip__select" id="m-map">${optionList(maps.map((m) => [m.map, `${m.map} (${m.matches})`]), local.map)}</select></label>
      </div>

      <div class="grid grid-kpi">
        ${kpi({ label: `Matches on ${local.map}`, value: String(current.matches), delta: { text: `${current.wins}W · ${current.matches - current.wins}L this period`, cls: 'is-flat' } })}
        ${kpi({ label: 'Win rate', value: pct(current.winRate), delta: ptsDelta(current.winRate, ms.filter((m) => m.win).length / ms.length, 'all maps') })}
        ${kpi({ label: 'Attack win rate', value: pct(current.atkRate), delta: ptsDelta(current.atkRate, overallSides.atk, 'all maps') })}
        ${kpi({ label: 'Defense win rate', value: pct(current.defRate), delta: ptsDelta(current.defRate, overallSides.def, 'all maps') })}
      </div>

      <div class="grid grid-2--wide-left">
        ${chartCard({ id: 'chart-maps', title: 'Win rate by map', subtitle: 'Match win rate · select a bar to inspect a map', aria: 'Match win rate for each map', axis: 'Maps →' })}
        ${chartCard({ id: 'chart-sides', title: 'Attack vs defense', subtitle: 'Round win rate by side', aria: 'Attack and defense round win rate for each map', axis: 'Maps →' })}
      </div>

      <div class="grid grid-2--wide-left">
        <section class="card" aria-labelledby="schem-title">
          <h2 class="card__title card__title--caps" id="schem-title">${esc(local.map)} · simplified map</h2>
          <div class="schematic">
            <div class="zone zone--a">Site A<small>${siteLine(sites.A)}</small></div>
            <div class="zone zone--mid">Mid<small>${siteLine(sites.Mid)}</small></div>
            <div class="zone zone--b">Site B<small>${siteLine(sites.B)}</small></div>
          </div>
          <p class="footnote footnote--plain">Abstract schematic — not official map artwork. Figures show your round win rate by area.</p>
        </section>
        <section class="card" aria-labelledby="out-title">
          <h2 class="card__title card__title--caps" id="out-title">Round outcome distribution</h2>
          <div class="bar-rows">${outcomeRows}</div>
          <p class="footnote footnote--plain">Share of ${outcomes.total} rounds played on ${esc(local.map)}.</p>
        </section>
      </div>
    </div>
    <p class="footnote footnote--plain">Profile &amp; settings · Default date range: ${esc(RANGES[prefs.range].label.toLowerCase())} · Theme: Dark · Data source: fictional sample data</p>`;

  bindFilters(root);
  root.querySelector('#m-map').addEventListener('change', (e) => { local.map = e.target.value; render(root); root.querySelector('#m-map')?.focus(); });

  const p = palette();
  barChart(document.getElementById('chart-maps'), {
    labels: maps.map((m) => m.map),
    values: maps.map((m) => +(m.winRate * 100).toFixed(1)),
    colors: maps.map((m) => (m.map === local.map ? p.cyan : p.bar)),
    yMax: 100,
    yFormat: (v) => `${v}%`,
    titles: (i) => maps[i].map,
    lines: (i) => `${pct(maps[i].winRate)} win rate · ${maps[i].wins}W of ${maps[i].matches}`,
    onClick: (i) => { local.map = maps[i].map; render(root); },
  });

  dotChart(document.getElementById('chart-sides'), {
    labels: maps.map((m) => m.map),
    datasets: [
      { label: 'Attack', data: maps.map((m) => +(m.atkRate * 100).toFixed(1)), color: p.red },
      { label: 'Defense', data: maps.map((m) => +(m.defRate * 100).toFixed(1)), color: p.cyan },
    ],
    yMin: 0,
    yMax: 100,
    legend: true,
    yFormat: (v) => `${v}%`,
    titles: (i) => maps[i].map,
    lines: (i, ds) => (ds === 0 ? `Attack ${pct(maps[i].atkRate)} (${maps[i].atkWon}/${maps[i].atkTotal} rounds)` : `Defense ${pct(maps[i].defRate)} (${maps[i].defWon}/${maps[i].defTotal} rounds)`),
  });
}
