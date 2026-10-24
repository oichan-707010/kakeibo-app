import { CATEGORIES, CATEGORY_COLORS } from '../utils/categories.js';
import { formatYen, sumItems } from '../utils/aggregate.js';
import { validateReceipt } from '../utils/validation.js';

/**
 * 登録済みレシートの一覧
 * 日時と商品のカテゴリはその場で修正できる
 * allReceipts は重複チェック用（表示中の月以外のレシートも含む全件）
 */
export default function ReceiptList({ receipts, allReceipts, onUpdate, onDelete }) {
  if (receipts.length === 0) {
    return (
      <section className="card">
        <h2>レシート一覧</h2>
        <p className="empty">まだレシートがありません。画像をアップロードしてください。</p>
      </section>
    );
  }

  // 日時の新しい順に並べる
  const sorted = [...receipts].sort(
    (a, b) => b.date.localeCompare(a.date) || (b.time ?? '').localeCompare(a.time ?? ''),
  );

  // 商品のカテゴリを変更する
  function changeCategory(receipt, index, category) {
    const items = receipt.items.map((item, i) => (i === index ? { ...item, category } : item));
    onUpdate({ ...receipt, items });
  }

  return (
    <section className="card">
      <h2>レシート一覧</h2>
      <div className="receipt-list">
        {sorted.map((receipt) => {
          const total = sumItems(receipt);
          const warnings = validateReceipt(receipt, allReceipts);
          return (
            <article key={receipt.id} className={`receipt ${warnings.length ? 'has-warning' : ''}`}>
              <header className="receipt-header">
                <div>
                  <h3>{receipt.storeName}</h3>
                  <div className="datetime">
                    <input
                      type="date"
                      value={receipt.date}
                      onChange={(e) =>
                        e.target.value && onUpdate({ ...receipt, date: e.target.value })
                      }
                    />
                    <input
                      type="time"
                      value={receipt.time ?? ''}
                      onChange={(e) => onUpdate({ ...receipt, time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="receipt-total">
                  <strong>{formatYen(total)}</strong>
                  <button
                    type="button"
                    className="delete"
                    onClick={() => {
                      if (confirm(`「${receipt.storeName}」のレシートを削除しますか？`)) {
                        onDelete(receipt.id);
                      }
                    }}
                  >
                    削除
                  </button>
                </div>
              </header>
              {warnings.map((msg) => (
                <p key={msg} className="warning">
                  ⚠ {msg}
                </p>
              ))}
              <table className="items">
                <thead>
                  <tr>
                    <th>商品名</th>
                    <th>カテゴリ</th>
                    <th className="num">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.items.map((item, i) => (
                    <tr key={i} className={item.price < 0 ? 'negative' : undefined}>
                      <td>{item.name}</td>
                      <td>
                        <select
                          value={item.category}
                          style={{ borderLeftColor: CATEGORY_COLORS[item.category] }}
                          onChange={(e) => changeCategory(receipt, i, e.target.value)}
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td className="num">{formatYen(item.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          );
        })}
      </div>
    </section>
  );
}
