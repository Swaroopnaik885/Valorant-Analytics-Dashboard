import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';

Chart.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function palette() {
  return {
    text: css('--text'),
    muted: css('--muted'),
    border: css('--border'),
    bar: css('--bar'),
    cyan: css('--accent-cyan'),
    red: css('--accent-red'),
    success: css('--success'),
    failed: css('--failed'),
    blue: css('--accent-blue'),
    elevated: css('--elevated'),
  };
}

function baseOptions({ yFormat, yMin, yMax, stacked = false, legend = false, interaction = 'index', maxXTicks = 12 }) {
  const p = palette();
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: prefersReducedMotion() ? false : { duration: 350 },
    interaction: { mode: interaction, intersect: false },
    layout: { padding: { top: 10, right: 10, left: 2 } },
    plugins: {
      legend: {
        display: legend,
        position: 'bottom',
        labels: { color: p.muted, usePointStyle: true, boxWidth: 7, boxHeight: 7, padding: 14, font: { size: 10 } },
      },
      tooltip: {
        backgroundColor: p.elevated,
        borderColor: p.border,
        borderWidth: 1,
        titleColor: p.text,
        bodyColor: p.muted,
        padding: 10,
        cornerRadius: 6,
        displayColors: false,
        titleFont: { size: 11, weight: '600' },
        bodyFont: { size: 11 },
      },
    },
    scales: {
      x: {
        stacked,
        grid: { display: false },
        border: { display: false },
        ticks: { color: p.muted, font: { size: 9 }, maxRotation: 0, autoSkip: true, maxTicksLimit: maxXTicks },
      },
      y: {
        stacked,
        min: yMin,
        max: yMax,
        beginAtZero: yMin === undefined,
        grid: { color: p.border },
        border: { display: false },
        ticks: { color: p.muted, font: { size: 9 }, maxTicksLimit: 5, callback: yFormat },
      },
    },
  };
}

function mount(canvas, config) {
  if (!canvas) return null;

  Object.values(Chart.instances).forEach((chart) => { if (!chart.canvas?.isConnected) chart.destroy(); });
  Chart.getChart(canvas)?.destroy();
  return new Chart(canvas, config);
}

function tooltipFrom({ titles, lines }) {
  return {
    callbacks: {
      title: (items) => (titles ? titles(items[0].dataIndex) : items[0].label),
      label: (item) => (lines ? lines(item.dataIndex, item.datasetIndex) : String(item.formattedValue)),
    },
  };
}

export function barChart(canvas, { labels, values, colors, yFormat, yMax, titles, lines, onClick, maxXTicks }) {
  const p = palette();
  const options = baseOptions({ yFormat, yMax, maxXTicks });
  options.plugins.tooltip = { ...options.plugins.tooltip, ...tooltipFrom({ titles, lines }) };
  if (onClick) {
    options.onClick = (_e, els) => { if (els.length) onClick(els[0].index); };
    options.onHover = (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; };
  }
  return mount(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors ?? p.bar,
        borderRadius: 3,
        borderSkipped: false,
        maxBarThickness: 56,
        categoryPercentage: 0.82,
        barPercentage: 0.9,
      }],
    },
    options,
  });
}

export function barWithLine(canvas, { labels, values, colors, lineValue, lineLabel, yFormat, yMax, titles, lines, onClick }) {
  const p = palette();
  const options = baseOptions({ yFormat, yMax });
  options.plugins.tooltip = { ...options.plugins.tooltip, ...tooltipFrom({ titles, lines }) };
  options.plugins.legend.display = true;
  if (onClick) {
    options.onClick = (_e, els) => { const bar = els.find((el) => el.datasetIndex === 0); if (bar) onClick(bar.index); };
  }
  return mount(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          type: 'bar', label: 'Win rate', data: values, backgroundColor: colors ?? p.bar,
          borderRadius: 3, borderSkipped: false, maxBarThickness: 56, categoryPercentage: 0.82, barPercentage: 0.9, order: 2,
        },
        {
          type: 'line', label: lineLabel, data: labels.map(() => lineValue), borderColor: p.muted, borderDash: [5, 4],
          borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 0, order: 1,
        },
      ],
    },
    options,
  });
}

export function dotChart(canvas, { labels, datasets, yFormat, yMin, yMax, titles, lines, legend = false, maxXTicks }) {
  const options = baseOptions({ yFormat, yMin, yMax, legend, interaction: 'nearest', maxXTicks });
  options.interaction = { mode: 'index', intersect: false };
  options.plugins.tooltip = { ...options.plugins.tooltip, ...tooltipFrom({ titles, lines }) };
  return mount(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: datasets.map((d) => ({
        label: d.label,
        data: d.data,
        showLine: false,
        borderWidth: 0,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: d.colors ?? d.color,
        pointBorderColor: 'transparent',
      })),
    },
    options,
  });
}

export function killDeathChart(canvas, { labels, kills, deaths, titles, lines }) {
  const p = palette();
  const options = baseOptions({ stacked: true, legend: true, yFormat: (v) => Math.abs(v), maxXTicks: 24 });
  options.plugins.tooltip = { ...options.plugins.tooltip, ...tooltipFrom({ titles, lines }) };
  return mount(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Kills', data: kills, backgroundColor: p.cyan, borderRadius: 3, borderSkipped: false, maxBarThickness: 28 },
        { label: 'Deaths', data: deaths.map((d) => -d), backgroundColor: p.red, borderRadius: 3, borderSkipped: false, maxBarThickness: 28 },
      ],
    },
    options,
  });
}

export function destroyAllCharts() {
  Object.values(Chart.instances).forEach((chart) => chart.destroy());
}

if (document.fonts?.ready) {
  document.fonts.ready.then(() => Object.values(Chart.instances).forEach((c) => c.update('none')));
}

Chart.defaults.font.family = css('--font') || 'sans-serif';
