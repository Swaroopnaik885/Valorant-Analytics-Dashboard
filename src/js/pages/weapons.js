import { getMatches, allMatches, RANGES, MODES } from '../data.js';
import { getFilters } from '../filters.js';
import { byWeapon } from '../analytics.js';
import { esc, pct } from '../utils.js';
import { pageHeader, bindFilters, chartCard, emptyState, showAllButton, bindEmptyActions } from '../ui.js';
import { barChart, palette } from '../charts.js';

const CATEGORY_LABEL = { Sidearm: 'Sidearms', SMG: 'SMGs', Rifle: 'Rifles', Sniper: 'Snipers', Shotgun: 'Shotguns', 'Machine Gun': 'Heavy' };
const CATEGORY_ORDER = Object.keys(CATEGORY_LABEL);
const MIN_HS_KILLS = 10;

const local = { category: 'all' };
export const enter = () => { local.category = 'all'; };

// Chips come from the whole dataset so they don't vanish when other filters change.
const availableCategories = CATEGORY_ORDER.filter((c) => byWeapon(allMatches).some((w) => w.category === c));

export function render(root) {
  const f = getFilters();
  const ms = getMatches(f);
  const header = pageHeader({ title: 'Weapon Analytics', subtitle: 'Weapon usage, eliminations and headshot performance', subtitleShort: 'Usage and headshot performance' });

  if (!ms.length) {
    root.innerHTML = header + emptyState({ text: `There are no ${f.mode === 'all' ? '' : `${MODES[f.mode].toLowerCase()} `}matches in the ${RANGES[f.range].phrase}.`, actions: showAllButton });
    bindFilters(root); bindEmptyActions(root);
    return;
  }

  const all = byWeapon(ms);
  const weapons = all.filter((w) => local.category === 'all' || w.category === local.category);
  const topHs = weapons.filter((w) => w.kills >= MIN_HS_KILLS).reduce((b, w) => (!b || w.hsRate > b.hsRate ? w : b), null);

  const chips = [['all', 'All weapons'], ...availableCategories.map((c) => [c, CATEGORY_LABEL[c]])]
    .map(([value, label]) => `<button type="button" class="chip__btn" data-cat="${esc(value)}" aria-pressed="${value === local.category}">${esc(label)}</button>`)
    .join('');

  const cards = weapons.map((w) => `
    <li>
      <article class="entity-card">
        <div class="entity-card__top">
          <span class="weapon-art" aria-hidden="true"><i class="${w === topHs ? 'is-cyan' : ''}"></i></span>
          <div class="entity-card__info">
            <h3 class="entity-card__name">${esc(w.weapon)}</h3>
            <p class="entity-card__role">${esc(w.category)}</p>
            <p class="entity-card__big entity-card__big--white">${w.kills} kills</p>
          </div>
        </div>
        <div class="entity-card__stats"><span class="cyan">HS% ${pct(w.hsRate)}</span><span class="muted">Matches ${w.matches}</span></div>
      </article>
    </li>`).join('');

  root.innerHTML = `
    ${header}
    <div class="stack">
      <div class="toolbar" role="group" aria-label="Weapon category">${chips}</div>
      ${weapons.length
        ? `<ul class="grid grid-cards" aria-label="Weapons">${cards}</ul>`
        : emptyState({ title: 'No weapon data', text: 'No kills were recorded with this weapon type in the selected period.' })}

      <div class="grid grid-2--wide-left">
        ${chartCard({ id: 'chart-weapons', title: 'Weapon usage distribution', subtitle: 'Kills per weapon', aria: 'Kills per weapon', axis: 'Weapons →' })}
        <section class="card" aria-labelledby="loadout-title">
          <h2 class="card__title card__title--caps" id="loadout-title">Loadout insights</h2>
          ${weapons.length ? `
          <div class="stat-block">
            <p class="label">Most kills</p>
            <p class="strong-line">${esc(weapons[0].weapon)} · ${weapons[0].kills} kills</p>
          </div>
          <div class="stat-block">
            <p class="label">Highest headshot rate</p>
            <p class="strong-line cyan">${topHs ? `${esc(topHs.weapon)} · ${pct(topHs.hsRate)}` : 'Not enough kills yet'}</p>
          </div>
          <p class="footnote footnote--plain">Headshot rate is ranked among weapons with at least ${MIN_HS_KILLS} kills.</p>` : '<p class="card__sub">Nothing to summarise for this category.</p>'}
        </section>
      </div>
    </div>`;

  bindFilters(root);
  root.querySelectorAll('[data-cat]').forEach((btn) => btn.addEventListener('click', () => {
    local.category = btn.dataset.cat;
    render(root);
    root.querySelector(`[data-cat="${CSS.escape(local.category)}"]`)?.focus();
  }));

  const p = palette();
  if (weapons.length) {
    barChart(document.getElementById('chart-weapons'), {
      labels: weapons.map((w) => w.weapon),
      values: weapons.map((w) => w.kills),
      colors: weapons.map((_, i) => (i === 0 ? p.cyan : p.bar)),
      titles: (i) => `${weapons[i].weapon} · ${weapons[i].category}`,
      lines: (i) => `${weapons[i].kills} kills · ${pct(weapons[i].hsRate)} headshots · used in ${weapons[i].matches} matches`,
    });
  }
}
