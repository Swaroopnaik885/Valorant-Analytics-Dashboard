import { getMatches, RANGES, MODES } from '../data.js';
import { getFilters } from '../filters.js';
import { summarize, byAgent, byWeapon } from '../analytics.js';
import { esc, pct, fixed, shortDate } from '../utils.js';
import { pageHeader, bindFilters, kpi, deltaInfo, chartCard, emptyState, showAllButton, bindEmptyActions, agentTint, agentLetter } from '../ui.js';
import { barWithLine, dotChart, palette } from '../charts.js';

export function render(root) {
  const f = getFilters();
  const ms = getMatches(f);
  const header = pageHeader({ title: 'Performance Analytics', subtitle: 'Agent, weapon and map performance in one place', subtitleShort: 'Agent and weapon performance' });

  if (!ms.length) {
    root.innerHTML = header + emptyState({ text: `There are no ${f.mode === 'all' ? '' : `${MODES[f.mode].toLowerCase()} `}matches in the ${RANGES[f.range].phrase}.`, actions: showAllButton });
    bindFilters(root); bindEmptyActions(root);
    return;
  }

  const s = summarize(ms);
  const agents = byAgent(ms);
  const weapons = byWeapon(ms);
  const topAgents = [...agents].sort((a, b) => b.matches - a.matches || b.winRate - a.winRate).slice(0, 4);
  const topWeapons = weapons.slice(0, 4);
  const lastTen = [...ms].reverse().slice(-10);

  const agentRows = topAgents.map((a) => {
    const t = agentTint(a.role);
    return `<li>
      <span class="token" style="background:${t.bg};color:${t.fg}" aria-hidden="true">${agentLetter(a.agent)}</span>
      <div><p class="mini-rows__name">${esc(a.agent)}</p><p class="mini-rows__sub">${esc(a.role)}</p></div>
      <span class="mini-rows__good">${pct(a.winRate)}</span>
      <span class="mini-rows__strong">K/D ${fixed(a.kd)}</span>
    </li>`;
  }).join('');

  const weaponRows = topWeapons.map((w, i) => `<li>
      <span class="weapon-ico" aria-hidden="true"><i class="${i === 2 ? 'is-cyan' : ''}"></i></span>
      <div><p class="mini-rows__name">${esc(w.weapon)}</p><p class="mini-rows__sub">${esc(w.category)}</p></div>
      <span class="mini-rows__muted">${w.kills} kills</span>
      <span class="mini-rows__good cyan">${pct(w.hsRate)} HS</span>
    </li>`).join('');

  root.innerHTML = `
    ${header}
    <div class="stack">
      <div class="grid grid-kpi">
        ${kpi({ label: 'Win rate', value: pct(s.winRate), delta: deltaInfo(ms, (x) => summarize(x).winRate, { scale: 100, digits: 1, unit: ' pts' }) })}
        ${kpi({ label: 'K/D ratio', value: fixed(s.kd), delta: deltaInfo(ms, (x) => summarize(x).kd, { digits: 2 }) })}
        ${kpi({ label: 'Avg. combat score', value: String(Math.round(s.acs)), delta: deltaInfo(ms, (x) => summarize(x).acs, { digits: 0 }) })}
        ${kpi({ label: 'Headshot %', value: pct(s.headshot), delta: deltaInfo(ms, (x) => summarize(x).headshot, { scale: 100, digits: 1, unit: ' pts' }) })}
      </div>

      <div class="grid grid-2--wide-left">
        ${chartCard({ id: 'chart-agents', title: 'Win rate by agent', subtitle: 'Compared with overall win rate', aria: 'Win rate for each agent compared with the overall win rate', axis: 'Agents →' })}
        ${chartCard({ id: 'chart-kd', title: 'K/D trend', subtitle: `Last ${lastTen.length} matches`, aria: 'K/D ratio for the most recent matches', axis: 'Matches →' })}
      </div>

      <div class="grid grid-2--wide-left">
        <section class="card" aria-labelledby="agent-perf-title">
          <h2 class="card__title card__title--caps" id="agent-perf-title">Agent performance</h2>
          <ul class="mini-rows">${agentRows}</ul>
        </section>
        <section class="card" aria-labelledby="weapon-perf-title">
          <h2 class="card__title card__title--caps" id="weapon-perf-title">Weapon performance</h2>
          <ul class="mini-rows">${weaponRows}</ul>
        </section>
      </div>
    </div>`;

  bindFilters(root);

  const p = palette();
  const top = agents[0];
  barWithLine(document.getElementById('chart-agents'), {
    labels: agents.map((a) => a.agent),
    values: agents.map((a) => +(a.winRate * 100).toFixed(1)),
    colors: agents.map((a) => (a === top ? p.cyan : p.bar)),
    lineValue: +(s.winRate * 100).toFixed(1),
    lineLabel: `Overall ${pct(s.winRate)}`,
    yMax: 100,
    yFormat: (v) => `${v}%`,
    titles: (i) => `${agents[i].agent} · ${agents[i].role}`,
    lines: (i, ds) => (ds === 0 ? `${pct(agents[i].winRate)} win rate · ${agents[i].wins}W of ${agents[i].matches}` : `Overall ${pct(s.winRate)}`),
  });

  dotChart(document.getElementById('chart-kd'), {
    labels: lastTen.map((m) => shortDate(m.played_at_local)),
    datasets: [{ label: 'K/D', data: lastTen.map((m) => m.player.kd_ratio), color: p.red }],
    yMin: 0,
    yFormat: (v) => v.toFixed(1),
    titles: (i) => `${lastTen[i].mapName} · ${lastTen[i].agent}`,
    lines: (i) => `K/D ${fixed(lastTen[i].player.kd_ratio)} (${lastTen[i].player.kills}/${lastTen[i].player.deaths})`,
    maxXTicks: 6,
  });
}
