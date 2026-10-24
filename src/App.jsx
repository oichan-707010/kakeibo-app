import { useState } from 'react';
import ReceiptUploader from './components/ReceiptUploader.jsx';
import ReceiptList from './components/ReceiptList.jsx';
import CategorySummary from './components/CategorySummary.jsx';
import MonthlyChart from './components/MonthlyChart.jsx';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { toMonth } from './utils/aggregate.js';

export default function App() {
  // 登録したレシートはローカルストレージに保存する
  const [receipts, setReceipts] = useLocalStorage('kakeibo.receipts', []);
  // 一覧とカテゴリ集計の対象月（'all' は全期間）
  const [month, setMonth] = useState('all');

  const addReceipt = (receipt) => setReceipts((prev) => [...prev, receipt]);
  const updateReceipt = (updated) =>
    setReceipts((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  const deleteReceipt = (id) => setReceipts((prev) => prev.filter((r) => r.id !== id));

  // 月の選択肢（新しい順）
  const months = [...new Set(receipts.map((r) => toMonth(r.date)))].sort().reverse();
  const filtered = month === 'all' ? receipts : receipts.filter((r) => toMonth(r.date) === month);
  const monthLabel = (m) => `${m.slice(0, 4)}年${Number(m.slice(5))}月`;

  return (
    <div className="app">
      <header className="app-header">
        <h1>レシート家計簿</h1>
        <label className="month-filter">
          表示する月
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="all">すべて</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </label>
      </header>

      <main className="layout">
        <div className="col">
          <ReceiptUploader receipts={receipts} onAdd={addReceipt} />
          <CategorySummary
            receipts={filtered}
            title={month === 'all' ? '全期間' : monthLabel(month)}
          />
          <MonthlyChart receipts={receipts} />
        </div>
        <div className="col">
          <ReceiptList
            receipts={filtered}
            allReceipts={receipts}
            onUpdate={updateReceipt}
            onDelete={deleteReceipt}
          />
        </div>
      </main>
    </div>
  );
}
