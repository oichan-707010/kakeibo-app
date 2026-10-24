import { CATEGORIES } from './categories.js';

// 金額を「¥1,234」形式に整形する（マイナスは「-¥1,234」）
export function formatYen(amount) {
  const sign = amount < 0 ? '-' : '';
  return `${sign}¥${Math.abs(amount).toLocaleString('ja-JP')}`;
}

// レシートの商品金額の合計
export function sumItems(receipt) {
  return receipt.items.reduce((sum, item) => sum + item.price, 0);
}

// 日付（YYYY-MM-DD）から月（YYYY-MM）を取り出す
export function toMonth(date) {
  return date.slice(0, 7);
}

// カテゴリ別の合計金額を集計する
export function totalsByCategory(receipts) {
  const totals = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  for (const receipt of receipts) {
    for (const item of receipt.items) {
      totals[item.category] = (totals[item.category] ?? 0) + item.price;
    }
  }
  return totals;
}

// 月別・カテゴリ別の合計金額を集計する（月は古い順）
export function totalsByMonth(receipts) {
  const byMonth = {};
  for (const receipt of receipts) {
    const month = toMonth(receipt.date);
    byMonth[month] ??= Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
    for (const item of receipt.items) {
      byMonth[month][item.category] = (byMonth[month][item.category] ?? 0) + item.price;
    }
  }
  const months = Object.keys(byMonth).sort();
  return { months, byMonth };
}
