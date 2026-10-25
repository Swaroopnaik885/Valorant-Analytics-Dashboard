import { getMatch } from '../data.js';
import { esc, pct, fixed, longDate } from '../utils.js';
import { pageHeader, bindFilters, kpi, chartCard, emptyState, rrText } from '../ui.js';
import { barChart, killDeathChart, palette } from '../charts.js';

const EVENT_LABEL = {
  opening_kill: 'Opening kill', trade_kill: 'Trade kill', multi_kill: 'Multi-kill', spike_plant: 'Spike plant',
  spike_defuse: 'Spike defuse', clutch: 'Clutch', utility_assist: 'Utility assist', first_death: 'First death', save: 'Saved',
};
const ECON_LABEL = { eco: 'Eco', half_buy: 'Half buy', full_buy: 'Full buy', force_buy: 'Force buy' };

function roundDetail(r) {
  const parts = [
    `<strong>Round ${r.round_number}</strong>`,
    `${r.side} · ${r.outcome === 'win' ? 'Won' : 'Lost'}`,
    `${ECON_LABEL[r.economy] ?? r.economy} (${r.credits_spent.toLocaleString('en-US')} credits)`,
    `${r.player_kills} ${r.player_kills === 1 ? 'kill' : 'kills'}, ${r.player_deaths} ${r.player_deaths === 1 ? 'death' : 'deaths'}, ${r.damage} damage`,
  ];
  if (r.event) parts.push(EVENT_LABEL[r.event] ?? r.event);
  if (r.spike_planted) parts.push(`Spike planted at ${r.site}${r.spike_defused ? ' and defused' : ''}`);
  return parts.join(' · ');
}

export function render(root, { params }) {
  const m = getMatch(params[0]);
  if (!m) {
    root.innerHTML = pageHeader({ title: 'Match not found', subtitle: 'This match is not in the sample data' }) + emptyState({
      title: 'Match not found',
      text: 'The link may be out of date. Head back to your match list.',
      actions: '<a class="btn" href="#/history">Back to matches</a>',
    });
    bindFilters(root);
    return;
  }

  const pl = m.player;
  const header = pageHeader({
    title: 'Match Details',
    subtitle: `${m.mode} / ${m.mapName} / ${longDate(m.played_at_local)}`,
    crumbs: ['Vanta', 'Analytics', 'Match'],
  });

  root.innerHTML = `
    ${header}
    <div class="stack">
      <section class="outcome ${m.win ? '' : 'outcome--loss'}" aria-label="Match result">
        <div>
          <p class="row__result ${m.win ? '' : 'is-down-text'}">${m.win ? 'Victory' : 'Defeat'}</p>
          <p class="outcome__score">${m.score.player_team} — ${m.score.opponent_team}</p>
        </div>
        <p class="outcome__item outcome__item--muted">${esc(m.mapName)} · ${esc(m.mode)}</p>
        <p class="outcome__item outcome__item--agent">${esc(m.agent)} · ${esc(m.role)}</p>
        <p class="outcome__item">${m.match_summary.rounds_played} rounds · <span class="${m.rank.rr_change >= 0 ? 'is-up' : 'is-down'}">${rrText(m.rank.rr_change)}</span></p>
        <a class="btn btn--ghost" href="#/history">Back to matches</a>
      </section>

      <div class="grid grid-kpi grid-kpi--8">
        ${kpi({ label: 'Kills', value: String(pl.kills) })}
        ${kpi({ label: 'Deaths', value: String(pl.deaths) })}
        ${kpi({ label: 'Assists', value: String(pl.assists) })}
        ${kpi({ label: 'K/D ratio', value: fixed(pl.kd_ratio) })}
        ${kpi({ label: 'Avg. combat score', value: String(pl.acs) })}
        ${kpi({ label: 'Damage / round', value: String(Math.round(pl.adr)) })}
        ${kpi({ label: 'Headshot %', value: pct(pl.headshot_rate) })}
        ${kpi({ label: 'First kills', value: String(pl.first_kills) })}
      </div>

      <div class="grid grid-match-charts">
        ${chartCard({ id: 'chart-damage', title: 'Round-by-round performance', subtitle: 'Damage dealt per round · cyan bars are rounds you won', aria: 'Damage dealt in each round', axis: 'Rounds →', tall: true })}
        ${chartCard({ id: 'chart-kd', title: 'Kill / death timeline', subtitle: 'Kills above the line, deaths below', aria: 'Kills and deaths in each round', axis: 'Rounds →', tall: true })}
      </div>

      <section class="card" aria-labelledby="rounds-title">
        <h2 class="card__title card__title--caps" id="rounds-title">Round-by-round breakdown</h2>
        <div class="round-tiles" id="tiles">
          ${m.rounds.map((r) => `
            <button type="button" class="tile ${r.outcome === 'win' ? '' : 'tile--loss'}" data-round="${r.round_number}" aria-pressed="false" aria-label="Round ${r.round_number}: ${r.outcome === 'win' ? 'won' : 'lost'}">
              <span>${String(r.round_number).padStart(2, '0')}</span>${r.outcome === 'win' ? 'Win' : 'Loss'}
            </button>`).join('')}
        </div>
        <p class="round-detail" id="round-detail" aria-live="polite">Select a round to see the economy, kills and events.</p>
      </section>
    </div>`;

  bindFilters(root);

  const tiles = root.querySelector('#tiles');
  const detail = root.querySelector('#round-detail');
  tiles.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-round]');
    if (!btn) return;
    tiles.querySelectorAll('[data-round]').forEach((t) => t.setAttribute('aria-pressed', String(t === btn)));
    detail.innerHTML = roundDetail(m.rounds[Number(btn.dataset.round) - 1]);
  });

  const p = palette();
  const labels = m.rounds.map((r) => String(r.round_number));
  barChart(document.getElementById('chart-damage'), {
    labels,
    values: m.rounds.map((r) => r.damage),
    colors: m.rounds.map((r) => (r.outcome === 'win' ? p.cyan : p.bar)),
    titles: (i) => `Round ${i + 1} · ${m.rounds[i].side}`,
    lines: (i) => `${m.rounds[i].damage} damage · ${m.rounds[i].outcome === 'win' ? 'Round won' : 'Round lost'}`,
    maxXTicks: 24,
  });
  killDeathChart(document.getElementById('chart-kd'), {
    labels,
    kills: m.rounds.map((r) => r.player_kills),
    deaths: m.rounds.map((r) => r.player_deaths),
    titles: (i) => `Round ${i + 1} · ${m.rounds[i].side}`,
    lines: (i, ds) => (ds === 0 ? `${m.rounds[i].player_kills} kills` : `${m.rounds[i].player_deaths} deaths`),
  });
}
