import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { CATEGORIES, CATEGORY_COLORS } from '../utils/categories.js';
import { formatYen, totalsByCategory } from '../utils/aggregate.js';

// 円グラフで使う Chart.js の部品を登録する
ChartJS.register(ArcElement, Tooltip, Legend);

/**
 * カテゴリ別の集計（円グラフ＋金額の表）
 */
export default function CategorySummary({ receipts, title }) {
  const totals = totalsByCategory(receipts);
  // 金額が 0 より大きいカテゴリだけ表示する
  const used = CATEGORIES.filter((c) => totals[c] > 0);
  const grandTotal = used.reduce((sum, c) => sum + totals[c], 0);

  const data = {
    labels: used,
    datasets: [
      {
        data: used.map((c) => totals[c]),
        backgroundColor: used.map((c) => CATEGORY_COLORS[c]),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const percent = Math.round((ctx.parsed / grandTotal) * 100);
            return ` ${formatYen(ctx.parsed)}（${percent}%）`;
          },
        },
      },
    },
  };

  return (
    <section className="card">
      <h2>カテゴリ別集計{title && <span className="sub">（{title}）</span>}</h2>
      {used.length === 0 ? (
        <p className="empty">データがありません。</p>
      ) : (
        <div className="summary">
          <div className="chart-box pie">
            <Pie data={data} options={options} />
          </div>
          <table className="totals">
            <tbody>
              {used.map((c) => (
                <tr key={c}>
                  <td>
                    <span className="dot" style={{ background: CATEGORY_COLORS[c] }} />
                    {c}
                  </td>
                  <td className="num">{formatYen(totals[c])}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>合計</td>
                <td className="num">{formatYen(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
