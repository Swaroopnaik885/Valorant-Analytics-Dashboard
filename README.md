# Vanta — Valorant Match Analytics Dashboard

A responsive, framework-free analytics dashboard built with **HTML5, CSS3, Vanilla JavaScript (ES modules) and Chart.js**, bundled by Vite.
All data is **synthetic sample data** (`src/data/matches.json`) — it is not a real Valorant account and there is no Riot Games connection.

## Run it

```bash
npm install        # first time only
npm run dev        # http://localhost:5173
npm run build      # production build -> dist/
npm run preview    # serve the production build
```

Requires Node 18+ (Vite 8 recommends 20.19+).

## Pages (hash routes)

| Route | Page |
| --- | --- |
| `#/overview` | Overview: KPIs, win/loss trend, recent ACS, match intel, recent matches, insights |
| `#/history` | Match History: search, result/map/agent/mode/range filters, sorting, "Load more" |
| `#/analytics` | Performance Analytics: KPIs, agent win rate, K/D trend, agent + weapon tables |
| `#/agents` | Agent Analytics: role filter, selectable agent cards, per-agent trend |
| `#/weapons` | Weapon Analytics: category filter, weapon cards, usage chart, loadout insights |
| `#/maps` | Maps & Rounds: map selector, attack/defense, schematic, round outcomes |
| `#/match/<id>` | Match Details: result, 8 stats, damage + kill/death charts, round tiles |
| `#/settings` | Profile & Settings: default range/mode, edit-profile dialog, reset |

## Project structure

```
index.html              App shell (sidebar, mobile top bar, <main> outlet)
src/css/style.css       Design tokens (CSS custom properties), reset, base type
src/css/layout.css      Shell, sidebar, page header, fluid grids
src/css/components.css  Cards, KPIs, chips, rows, tiles, dialog, etc.
src/css/responsive.css  Breakpoints (drawer < 1024px, mobile layout < 600px, touch targets)
src/data/matches.json   Sample dataset (unchanged)
src/js/main.js          Entry point
src/js/data.js          Loads the dataset; mode/range filtering
src/js/filters.js       Global filter + saved preferences (localStorage)
src/js/analytics.js     Pure metric functions (win rate, K/D, agents, maps, weapons…)
src/js/charts.js        Chart.js registration + chart factories (destroy/update safe)
src/js/ui.js            Shared HTML builders (header, KPI, chart card, empty state)
src/js/navigation.js    Hash router, sidebar/drawer behaviour
src/js/pages/*.js       One module per page: render(root) draws HTML + charts
```

Every number is **derived from match records** in `analytics.js`; nothing is hardcoded. Replace `matches.json` (same shape) or swap the import in `data.js` for a fetch to use another source.

## Notes and deliberate decisions

- **Figma vs data:** the Figma frames contain placeholder numbers (e.g. 64.2% win rate, Jett/Ascent). The app shows values computed from the dataset instead, and uses the dataset's player (VantaPilot#APAC, Diamond 2).
- **"vs earlier" deltas:** the dataset has no previous period, so each KPI compares the newer half of the filtered matches with the older half.
- **Match duration** does not exist in the dataset, so list rows show RR change in that column.
- **Maps:** the dataset has no Ascent; the Maps page has a map selector (defaults to the most-played map).
- **Round data caveat:** in the sample dataset every won round precedes every lost round within a match (and sides switch at the halfway point), so attack/defense win rates and the round tiles look more extreme than real games. This is a property of the data, not the code.
- **Theme:** only the dark theme exists in the design; the theme control is shown disabled.
- **Content width:** layouts are fluid (max content width 1680px, 1880px above 2200px), so at 1440px the content is slightly wider than the 1086px in the Figma frame.
