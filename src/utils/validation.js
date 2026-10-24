import { formatYen, sumItems } from './aggregate.js';

// 重複判定に使うキー（日付・時刻・合計金額が同じなら同一とみなす）
function duplicateKey(receipt) {
  return `${receipt.date}|${receipt.time ?? ''}|${sumItems(receipt)}`;
}

// 日付と時刻を表示用の文字列にする
export function formatDateTime(receipt) {
  return receipt.time ? `${receipt.date} ${receipt.time}` : receipt.date;
}

/**
 * 同じ日時・合計金額のレシートを others の中から探す
 * excludeId と同じ id のレシートは対象外（自分自身との比較を避ける）
 */
export function findDuplicates(receipt, others, excludeId = receipt.id) {
  const key = duplicateKey(receipt);
  return others.filter((r) => r.id !== excludeId && duplicateKey(r) === key);
}

/**
 * レシートの検証を行い、警告メッセージの一覧を返す
 */
export function validateReceipt(receipt, allReceipts) {
  const warnings = [];
  const total = sumItems(receipt);

  // 金額が負の値の商品がある
  const negativeItems = receipt.items.filter((item) => item.price < 0);
  if (negativeItems.length > 0) {
    warnings.push(
      `金額がマイナスの商品が ${negativeItems.length} 件あります（値引きでなければ読み取りミスの可能性があります）。`,
    );
  }

  // 合計金額が負の値
  if (total < 0) {
    warnings.push(`合計金額がマイナス（${formatYen(total)}）になっています。`);
  }

  // 商品の合計とレシート記載の合計がずれている
  if (receipt.printedTotal != null && receipt.printedTotal !== total) {
    warnings.push(
      `レシート記載の合計（${formatYen(receipt.printedTotal)}）と商品の合計が一致しません。`,
    );
  }

  // 同じ日時・合計金額のレシートが他にある
  if (findDuplicates(receipt, allReceipts).length > 0) {
    warnings.push(
      `同じ日時（${formatDateTime(receipt)}）・合計金額（${formatYen(total)}）のレシートが既に登録されています。重複していないか確認してください。`,
    );
  }

  return warnings;
}
