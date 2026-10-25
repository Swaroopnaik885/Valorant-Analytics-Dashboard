import { getMatches, RANGES, MODES } from '../data.js';
import { getFilters } from '../filters.js';
import { summarize, byAgent, bestBy } from '../analytics.js';
import { esc, pct, fixed, shortDate } from '../utils.js';
import { pageHeader, bindFilters, chartCard, emptyState, showAllButton, bindEmptyActions, optionList, rangeOptions, agentTint, agentLetter } from '../ui.js';
import { barWithLine, barChart, palette } from '../charts.js';

const local = { role: 'all', agent: null };
export const enter = () => { local.role = 'all'; local.agent = null; };

export function render(root) {
  const f = getFilters();
  const ms = getMatches(f);
  const header = pageHeader({ title: 'Agent Analytics', subtitle: 'Compare role performance and find your best pick', subtitleShort: 'Find your best pick' });

  if (!ms.length) {
    root.innerHTML = header + emptyState({ text: `There are no ${f.mode === 'all' ? '' : `${MODES[f.mode].toLowerCase()} `}matches in the ${RANGES[f.range].phrase}.`, actions: showAllButton });
    bindFilters(root); bindEmptyActions(root);
    return;
  }

  const everyAgent = byAgent(ms);
  const roles = [...new Set(everyAgent.map((a) => a.role))].sort();
  if (local.role !== 'all' && !roles.includes(local.role)) local.role = 'all';
  const agents = everyAgent.filter((a) => local.role === 'all' || a.role === local.role);
  const top = bestBy(everyAgent, 'winRate');
  if (!agents.some((a) => a.agent === local.agent)) local.agent = agents[0].agent;
  const selected = agents.find((a) => a.agent === local.agent);
  const overall = summarize(ms).winRate;

  const cards = agents.map((a) => {
    const t = agentTint(a.role);
    return `
      <li>
        <button type="button" class="entity-card" data-agent="${esc(a.agent)}" aria-pressed="${a.agent === local.agent}">
          <span class="entity-card__top">
            <span class="portrait" style="background:${t.bg};color:${t.fg}" aria-hidden="true">${agentLetter(a.agent)}</span>
            <span class="entity-card__info">
              <span class="entity-card__name">${esc(a.agent)}</span>
              <span class="entity-card__role entity-card__role--block">${esc(a.role)}</span>
              <span class="entity-card__big entity-card__big--block">${pct(a.winRate)}</span>
            </span>
          </span>
          <span class="entity-card__stats"><span>K/D ${fixed(a.kd)}</span><span class="muted">Matches ${a.matches}</span></span>
        </button>
      </li>`;
  }).join('');

  root.innerHTML = `
    ${header}
    <div class="stack">
      <div class="toolbar toolbar--between">
        <p class="eyebrow">Top performer / ${esc(top.agent)} · ${pct(top.winRate)} win rate</p>
        <div class="toolbar">
          <label class="chip"><span class="visually-hidden">Role</span>
            <select class="chip__select chip__select--muted" id="a-role">${optionList([['all', 'All roles'], ...roles.map((r) => [r, r])], local.role)}</select></label>
          <label class="chip"><span class="visually-hidden">Date range</span>
            <select class="chip__select chip__select--muted" id="a-range" data-filter="range">${rangeOptions(f.range)}</select></label>
        </div>
      </div>

      <ul class="grid grid-cards" aria-label="Agents">${cards}</ul>

      <div class="grid grid-2--wide-left">
        ${chartCard({ id: 'chart-agent-wr', title: 'Win rate by agent', subtitle: 'Select a bar or a card to inspect an agent', aria: 'Win rate for each agent compared with the overall win rate', axis: 'Agents →' })}
        ${chartCard({ id: 'chart-agent-trend', title: `${selected.agent} performance trend`, subtitle: `Combat score per match · average ${Math.round(selected.avgAcs)}`, aria: `Combat score in each match played as ${selected.agent}`, axis: 'Matches →' })}
      </div>
    </div>`;

  bindFilters(root);
  root.querySelector('#a-role').addEventListener('change', (e) => { local.role = e.target.value; render(root); root.querySelector('#a-role')?.focus(); });

  const select = (name) => { local.agent = name; render(root); root.querySelector(`[data-agent="${CSS.escape(name)}"]`)?.focus(); };
  root.querySelectorAll('[data-agent]').forEach((btn) => btn.addEventListener('click', () => select(btn.dataset.agent)));

  const p = palette();
  barWithLine(document.getElementById('chart-agent-wr'), {
    labels: agents.map((a) => a.agent),
    values: agents.map((a) => +(a.winRate * 100).toFixed(1)),
    colors: agents.map((a) => (a.agent === local.agent ? p.cyan : p.bar)),
    lineValue: +(overall * 100).toFixed(1),
    lineLabel: `Overall ${pct(overall)}`,
    yMax: 100,
    yFormat: (v) => `${v}%`,
    titles: (i) => `${agents[i].agent} · ${agents[i].role}`,
    lines: (i, ds) => (ds === 0 ? `${pct(agents[i].winRate)} win rate · ${agents[i].wins}W of ${agents[i].matches}` : `Overall ${pct(overall)}`),
    onClick: (i) => select(agents[i].agent),
  });

  const games = ms.filter((m) => m.agent === local.agent).reverse();
  barChart(document.getElementById('chart-agent-trend'), {
    labels: games.map((m) => shortDate(m.played_at_local)),
    values: games.map((m) => m.player.acs),
    colors: games.map((_, i) => (i === games.length - 1 ? p.red : p.bar)),
    titles: (i) => `${games[i].mapName} · ${games[i].win ? 'Win' : 'Loss'} ${games[i].score.display}`,
    lines: (i) => `ACS ${games[i].player.acs} · K/D ${fixed(games[i].player.kd_ratio)}`,
  });
}
