export const sum = (arr, fn) => arr.reduce((total, item) => total + fn(item), 0);
export const mean = (arr, fn) => (arr.length ? sum(arr, fn) / arr.length : 0);
const safeDiv = (a, b) => (b ? a / b : 0);

export function summarize(ms) {
  const wins = ms.filter((m) => m.win).length;
  const kills = sum(ms, (m) => m.player.kills);
  const deaths = sum(ms, (m) => m.player.deaths);
  return {
    count: ms.length,
    wins,
    losses: ms.length - wins,
    winRate: safeDiv(wins, ms.length),
    kills,
    deaths,
    assists: sum(ms, (m) => m.player.assists),
    kd: safeDiv(kills, deaths),
    acs: mean(ms, (m) => m.player.acs),
    adr: mean(ms, (m) => m.player.adr),
    headshot: mean(ms, (m) => m.player.headshot_rate),
    kast: mean(ms, (m) => m.player.kast),
    firstKills: sum(ms, (m) => m.player.first_kills),
    personalBest: ms.reduce((best, m) => (m.player.kills > (best?.player.kills ?? -1) ? m : best), null),
  };
}

export function splitDelta(ms, metric) {
  if (ms.length < 4) return null;
  const cut = Math.ceil(ms.length / 2);
  return metric(ms.slice(0, cut)) - metric(ms.slice(cut));
}

export function streak(ms) {
  if (!ms.length) return { type: 'win', length: 0 };
  const type = ms[0].result;
  let length = 0;
  for (const m of ms) {
    if (m.result !== type) break;
    length += 1;
  }
  return { type, length };
}

export function byAgent(ms) {
  const map = new Map();
  for (const m of ms) {
    const a = map.get(m.agent) ?? { agent: m.agent, role: m.role, matches: 0, wins: 0, kills: 0, deaths: 0, assists: 0, acsTotal: 0 };
    a.matches += 1;
    a.wins += m.win ? 1 : 0;
    a.kills += m.player.kills;
    a.deaths += m.player.deaths;
    a.assists += m.player.assists;
    a.acsTotal += m.player.acs;
    map.set(m.agent, a);
  }
  return [...map.values()]
    .map((a) => ({ ...a, winRate: safeDiv(a.wins, a.matches), kd: safeDiv(a.kills, a.deaths), avgAcs: safeDiv(a.acsTotal, a.matches) }))
    .sort((a, b) => b.winRate - a.winRate || b.matches - a.matches || a.agent.localeCompare(b.agent));
}

export function byMap(ms) {
  const map = new Map();
  for (const m of ms) {
    const x = map.get(m.mapName) ?? { map: m.mapName, matches: 0, wins: 0, atkWon: 0, atkTotal: 0, defWon: 0, defTotal: 0 };
    x.matches += 1;
    x.wins += m.win ? 1 : 0;
    for (const r of m.rounds) {
      if (r.side === 'Attack') { x.atkTotal += 1; x.atkWon += r.outcome === 'win' ? 1 : 0; }
      else { x.defTotal += 1; x.defWon += r.outcome === 'win' ? 1 : 0; }
    }
    map.set(m.mapName, x);
  }
  return [...map.values()]
    .map((x) => ({ ...x, winRate: safeDiv(x.wins, x.matches), atkRate: safeDiv(x.atkWon, x.atkTotal), defRate: safeDiv(x.defWon, x.defTotal) }))
    .sort((a, b) => b.winRate - a.winRate || b.matches - a.matches || a.map.localeCompare(b.map));
}

export function byWeapon(ms) {
  const map = new Map();
  for (const m of ms) {
    for (const w of m.weapon_breakdown) {
      const x = map.get(w.weapon) ?? { weapon: w.weapon, category: w.category, kills: 0, headshots: 0, matches: 0, damage: 0 };
      x.kills += w.kills;
      x.headshots += w.headshot_kills;
      x.damage += w.damage;
      x.matches += 1;
      map.set(w.weapon, x);
    }
  }
  return [...map.values()]
    .map((x) => ({ ...x, hsRate: safeDiv(x.headshots, x.kills) }))
    .sort((a, b) => b.kills - a.kills || a.weapon.localeCompare(b.weapon));
}

export function sideRates(ms) {
  const t = { atkWon: 0, atkTotal: 0, defWon: 0, defTotal: 0 };
  for (const m of ms) {
    for (const r of m.rounds) {
      if (r.side === 'Attack') { t.atkTotal += 1; t.atkWon += r.outcome === 'win' ? 1 : 0; }
      else { t.defTotal += 1; t.defWon += r.outcome === 'win' ? 1 : 0; }
    }
  }
  return { atk: safeDiv(t.atkWon, t.atkTotal), def: safeDiv(t.defWon, t.defTotal), atkTotal: t.atkTotal, defTotal: t.defTotal };
}

export function roundOutcomes(ms) {
  const rounds = ms.flatMap((m) => m.rounds);
  const total = rounds.length;
  const count = (fn) => rounds.filter(fn).length;
  const rows = [
    { key: 'defuse', label: 'Won · spike defused', n: count((r) => r.outcome === 'win' && r.spike_defused) },
    { key: 'plant', label: 'Won · spike planted', n: count((r) => r.outcome === 'win' && r.spike_planted && !r.spike_defused) },
    { key: 'clean', label: 'Won · no spike action', n: count((r) => r.outcome === 'win' && !r.spike_planted && !r.spike_defused) },
    { key: 'loss', label: 'Round lost', n: count((r) => r.outcome === 'loss') },
  ];
  return { total, rows: rows.map((r) => ({ ...r, share: safeDiv(r.n, total) })) };
}

export function siteStats(ms) {
  const out = { A: { n: 0, won: 0 }, Mid: { n: 0, won: 0 }, B: { n: 0, won: 0 } };
  for (const m of ms) {
    for (const r of m.rounds) {
      const s = out[r.site];
      if (!s) continue;
      s.n += 1;
      s.won += r.outcome === 'win' ? 1 : 0;
    }
  }
  return out;
}

export function bestBy(list, key, min = 2, sizeKey = 'matches') {
  const pool = list.filter((x) => x[sizeKey] >= min);
  const source = pool.length ? pool : list;
  return source.reduce((best, x) => (!best || x[key] > best[key] ? x : best), null);
}

export const rrChange = (m) => m.rank.rr_change;
