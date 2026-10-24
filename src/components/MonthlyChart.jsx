import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { CATEGORIES, CATEGORY_COLORS } from '../utils/categories.js';
import { formatYen, totalsByMonth } from '../utils/aggregate.js';

// 棒グラフで使う Chart.js の部品を登録する
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

/**
 * 月別の支出（カテゴリごとの積み上げ棒グラフ）
 */
export default function MonthlyChart({ receipts }) {
  const { months, byMonth } = totalsByMonth(receipts);

  // 1か月でも金額があるカテゴリだけ系列にする
  const used = CATEGORIES.filter((c) => months.some((m) => byMonth[m][c] > 0));
  // 各月の合計金額
  const monthTotals = months.map((m) => Object.values(byMonth[m]).reduce((a, b) => a + b, 0));

  const data = {
    // 「2026-10」を「2026年10月」と表示する
    labels: months.map((m) => `${m.slice(0, 4)}年${Number(m.slice(5))}月`),
    datasets: used.map((c) => ({
      label: c,
      data: months.map((m) => byMonth[m][c]),
      backgroundColor: CATEGORY_COLORS[c],
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { stacked: true },
      y: { stacked: true, ticks: { callback: (v) => formatYen(v) } },
    },
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${formatYen(ctx.parsed.y)}`,
          // ツールチップの下にその月の合計を表示する
          footer: (items) => `合計: ${formatYen(monthTotals[items[0].dataIndex])}`,
        },
      },
    },
  };

  return (
    <section className="card">
      <h2>月別の支出</h2>
      {months.length === 0 ? (
        <p className="empty">データがありません。</p>
      ) : (
        <div className="chart-box bar">
          <Bar data={data} options={options} />
        </div>
      )}
    </section>
  );
}
