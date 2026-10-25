import raw from '../data/matches.json';

function parseLocal(str) {
  const [date, time] = str.split(' ');
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return Date.UTC(y, m - 1, d, h, mi);
}

export const dataset = raw;
export const DISCLAIMER = raw.player_profile.disclaimer;

export const allMatches = raw.match_history.matches
  .map((m) => ({
    ...m,
    ts: parseLocal(m.played_at_local),
    win: m.result === 'win',
    mapName: m.map.name,
    agent: m.player.agent,
    role: m.player.agent_role,
  }))
  .sort((a, b) => b.ts - a.ts);

export const REFERENCE_TS = parseLocal(raw.generated_at.slice(0, 16).replace('T', ' '));

export const MODES = { Competitive: 'Competitive', Unrated: 'Unrated', all: 'All modes' };

export const RANGES = {
  '7d': { label: 'Last 7 days', phrase: 'last 7 days', days: 7 },
  '30d': { label: 'Last 30 days', phrase: 'last 30 days', days: 30 },
  all: { label: 'All matches', phrase: 'recorded matches', days: null },
};

export const SORTS = {
  recent: 'Sort: Recent',
  oldest: 'Sort: Oldest',
  acs: 'Sort: Highest ACS',
  kd: 'Sort: Best K/D',
  rr: 'Sort: Biggest RR gain',
};

export const MAP_NAMES = raw.match_history.filter_options.maps;
export const AGENT_NAMES = raw.match_history.filter_options.agents;

const DAY = 86_400_000;

export function getMatches({ mode, range }) {
  const days = RANGES[range]?.days ?? null;
  return allMatches.filter((m) => {
    if (mode !== 'all' && m.mode !== mode) return false;
    if (days !== null && m.ts < REFERENCE_TS - days * DAY) return false;
    return true;
  });
}

export const getMatch = (id) => allMatches.find((m) => m.match_id === id) ?? null;

export function currentRank() {
  const latest = allMatches[0];
  return {
    tier: latest.rank.rank_after,
    rr: latest.rank.rr_after,
    peak: raw.player_profile.current_rank.peak_rank,
  };
}

export const baseProfile = raw.player_profile;
