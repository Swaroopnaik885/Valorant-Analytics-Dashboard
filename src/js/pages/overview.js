import { getMatches, currentRank, RANGES, MODES } from '../data.js';
import { getFilters, getProfile } from '../filters.js';
import { summarize, streak, byAgent, byMap, bestBy } from '../analytics.js';
import { esc, pct, fixed, shortDate } from '../utils.js';
import { pageHeader, bindFilters, kpi, deltaInfo, chartCard, emptyState, showAllButton, bindEmptyActions, rrText, rrClass } from '../ui.js';
import { barChart, dotChart, palette } from '../charts.js';

const modeWords = (mode) => (mode === 'all' ? 'performance across all modes' : `${mode.toLowerCase()} performance`);

export function render(root) {
  const f = getFilters();
  const ms = getMatches(f);
  const range = RANGES[f.range];
  const header = pageHeader({
    title: 'Overview',
    subtitle: `Your ${modeWords(f.mode)} at a glance`,
    subtitleShort: `Your ${range.phrase}`,
  });

  if (!ms.length) {
    root.innerHTML = header + emptyState({
      text: `There are no ${f.mode === 'all' ? '' : `${MODES[f.mode].toLowerCase()} `}matches in the ${range.phrase}. Widen the filters to see your stats.`,
      actions: showAllButton,
    });
    bindFilters(root);
    bindEmptyActions(root);
    return;
  }

  const s = summarize(ms);
  const chrono = [...ms].reverse();
  const rank = currentRank();
  const run = streak(ms);
  const agents = byAgent(ms);
  const maps = byMap(ms);
  const bestAgent = bestBy(agents, 'winRate');
  const bestMap = bestBy(maps, 'winRate');
  const best = s.personalBest;
  const player = getProfile();

  const recent = ms.slice(0, 4).map((m) => `
    <li>
      <a class="row row--recent ${m.win ? '' : 'row--loss'}" href="#/match/${esc(m.match_id)}">
        <span class="row__result">${m.win ? 'Win' : 'Loss'}</span>
        <span class="row__main row__ellipsis">${esc(m.mapName)} · ${esc(m.agent)}</span>
        <span class="row__kda">${m.player.kills} / ${m.player.deaths} / ${m.player.assists}</span>
        <span class="row__acs"><span class="visually-hidden">ACS </span>${m.player.acs}</span>
        <span class="row__meta ${rrClass(m.rank.rr_change)}">${rrText(m.rank.rr_change)}</span>
      </a>
    </li>`).join('');

  root.innerHTML = `
    ${header}
    <div class="hero">
      <div>
        <h2 class="hero__title">Welcome back, ${esc(player.name)}</h2>
        <p class="hero__sub">Your ${esc(range.phrase)}, distilled into the metrics that matter.</p>
      </div>
      <a class="btn" href="#/history">View match history ↗</a>
    </div>

    <div class="stack">
      <div class="grid grid-kpi">
        ${kpi({ label: 'Win rate', value: pct(s.winRate), delta: deltaInfo(ms, (x) => summarize(x).winRate, { scale: 100, digits: 1, unit: ' pts' }) })}
        ${kpi({ label: 'K / D ratio', value: fixed(s.kd), delta: deltaInfo(ms, (x) => summarize(x).kd, { digits: 2 }) })}
        ${kpi({ label: 'Avg. combat score', value: String(Math.round(s.acs)), delta: deltaInfo(ms, (x) => summarize(x).acs, { digits: 0 }) })}
        ${kpi({ label: 'Headshot %', value: pct(s.headshot), delta: deltaInfo(ms, (x) => summarize(x).headshot, { scale: 100, digits: 1, unit: ' pts' }) })}
        ${kpi({ label: 'Matches played', value: String(s.count), delta: { text: `${s.wins}W · ${s.losses}L this period`, cls: 'is-flat' } })}
      </div>

      <div class="grid grid-overview-charts">
        ${chartCard({ id: 'chart-trend', title: 'Win / loss trend', subtitle: `${pct(s.winRate)} win rate · ${s.count} matches`, aria: 'Cumulative win rate after each match, oldest to newest', axis: 'Matches →' })}
        ${chartCard({ id: 'chart-acs', title: 'Recent combat score', subtitle: `Average ACS ${Math.round(s.acs)}`, aria: 'Average combat score for the most recent matches', axis: 'Matches →' })}
        <section class="card" aria-labelledby="intel-title">
          <h2 class="label" id="intel-title">Match intel</h2>
          <div class="stat-block">
            <p class="stat-block__big">${esc(rank.tier)}</p>
            <p class="stat-block__cap">${rank.rr} RR · peak ${esc(rank.peak)}</p>
          </div>
          <div class="stat-block">
            <p class="label">Personal best</p>
            <p class="stat-block__value stat-block__value--lg is-up">${best.player.kills} kills</p>
            <p class="stat-block__cap">${esc(best.mapName)} · ${esc(best.agent)}</p>
          </div>
        </section>
      </div>

      <div class="grid grid-overview-bottom">
        <section class="card" aria-labelledby="recent-title">
          <div class="card__head">
            <h2 class="card__title" id="recent-title">Recent matches</h2>
            <a class="link-action" href="#/history">View all ↗</a>
          </div>
          <ul class="rows rows--spaced">${recent}</ul>
        </section>

        <section class="card" aria-labelledby="insights-title">
          <h2 class="label" id="insights-title">Performance insights</h2>
          <div class="stat-block">
            <p class="stat-block__big stat-block__big--sm ${run.type === 'win' ? 'is-up' : 'is-down'}">${String(run.length).padStart(2, '0')} ${run.type === 'win' ? 'win' : 'loss'} streak</p>
          </div>
          <div class="stat-block">
            <p class="label">Best agent</p>
            <p class="stat-block__value">${esc(bestAgent.agent)} · ${pct(bestAgent.winRate, 0)} win rate (${bestAgent.matches} ${bestAgent.matches === 1 ? 'match' : 'matches'})</p>
          </div>
          <div class="stat-block">
            <p class="label">Strongest map</p>
            <p class="stat-block__value">${esc(bestMap.map)} · ${pct(bestMap.winRate, 0)} win rate (${bestMap.matches} ${bestMap.matches === 1 ? 'match' : 'matches'})</p>
          </div>
          <p class="callout">${esc(ms[0].notes.coach_summary)}</p>
        </section>
      </div>
    </div>
    <p class="footnote">Demo data · fictional sample metrics · no Riot Games connection</p>`;

  bindFilters(root);
  drawCharts(chrono);
}

function drawCharts(chrono) {
  const p = palette();

  // Cumulative win rate after each match, coloured by that match's result.
  let wins = 0;
  const cumulative = chrono.map((m, i) => {
    wins += m.win ? 1 : 0;
    return { rate: (wins / (i + 1)) * 100, wins, played: i + 1 };
  });
  dotChart(document.getElementById('chart-trend'), {
    labels: chrono.map((m) => shortDate(m.played_at_local)),
    datasets: [{ label: 'Win rate', data: cumulative.map((c) => +c.rate.toFixed(1)), colors: chrono.map((m) => (m.win ? p.success : p.failed)) }],
    yMin: 0,
    yMax: 100,
    yFormat: (v) => `${v}%`,
    titles: (i) => `${chrono[i].mapName} · ${chrono[i].agent}`,
    lines: (i) => `${chrono[i].win ? 'Win' : 'Loss'} ${chrono[i].score.display} · ${cumulative[i].rate.toFixed(1)}% after ${cumulative[i].played} (${cumulative[i].wins}W)`,
  });

  const last = chrono.slice(-10);
  barChart(document.getElementById('chart-acs'), {
    labels: last.map((m) => shortDate(m.played_at_local)),
    values: last.map((m) => m.player.acs),
    colors: last.map((_, i) => (i === last.length - 1 ? p.cyan : p.bar)),
    titles: (i) => `${last[i].mapName} · ${last[i].agent}`,
    lines: (i) => `ACS ${last[i].player.acs} · ${last[i].win ? 'Win' : 'Loss'} ${last[i].score.display}`,
    maxXTicks: 5,
  });
}
