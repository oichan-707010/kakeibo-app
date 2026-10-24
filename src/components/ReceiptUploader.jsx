import { useRef, useState } from 'react';
import { formatYen, sumItems } from '../utils/aggregate.js';
import { findDuplicates, formatDateTime } from '../utils/validation.js';
import { resizeImage } from '../utils/resizeImage.js';

// 今日の日付を YYYY-MM-DD 形式で返す
function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * レシート画像をアップロードしてバックエンドで解析するフォーム
 * 解析に成功すると onAdd に新しいレシートデータを渡す
 */
export default function ReceiptUploader({ receipts, onAdd }) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState(null); // 進捗メッセージ
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1枚の画像をバックエンドに送り、解析結果を受け取る
  async function analyze(file) {
    // 大きな画像は送信前に縮小する（サーバーの 5MB 制限に収めるため）
    const resized = await resizeImage(file);
    const formData = new FormData();
    formData.append('image', resized);
    const res = await fetch('/api/receipts/analyze', { method: 'POST', body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'レシートの読み取りに失敗しました。');
    }
    return data;
  }

  async function handleFiles(files) {
    if (files.length === 0) return;
    setLoading(true);
    setErrors([]);
    setWarnings([]);
    const failed = [];
    const warned = [];
    // 今回の追加分も含めて重複を判定するため、手元に一覧を持っておく
    const known = [...receipts];

    // 複数枚選ばれた場合は1枚ずつ順番に解析する
    for (const [i, file] of files.entries()) {
      setStatus(`読み取り中… (${i + 1}/${files.length}) ${file.name}`);
      try {
        const result = await analyze(file);
        const receipt = {
          id: crypto.randomUUID(),
          storeName: result.storeName || '店名不明',
          // 日付が読み取れなかった場合は今日の日付にする
          date: /^\d{4}-\d{2}-\d{2}$/.test(result.date) ? result.date : today(),
          time: /^\d{2}:\d{2}$/.test(result.time) ? result.time : '',
          items: result.items,
          printedTotal: result.total,
          createdAt: new Date().toISOString(),
        };

        // 同じ日時・合計金額のレシートが既にあれば警告する（登録自体は行う）
        if (findDuplicates(receipt, known).length > 0) {
          warned.push(
            `${file.name}: 同じ日時（${formatDateTime(receipt)}）・合計金額（${formatYen(sumItems(receipt))}）のレシートが既にあります。重複していれば一覧から削除してください。`,
          );
        }
        // 金額がマイナスの商品があれば警告する
        if (receipt.items.some((item) => item.price < 0)) {
          warned.push(`${file.name}: 金額がマイナスの商品があります。内容を確認してください。`);
        }

        known.push(receipt);
        onAdd(receipt);
      } catch (err) {
        failed.push(`${file.name}: ${err.message}`);
      }
    }

    setErrors(failed);
    setWarnings(warned);
    setStatus(null);
    setLoading(false);
    inputRef.current.value = '';
  }

  return (
    <section className="card uploader">
      <h2>レシートを追加</h2>
      <label className={`dropzone ${loading ? 'is-loading' : ''}`}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          disabled={loading}
          onChange={(e) => handleFiles([...e.target.files])}
        />
        {loading ? (
          <span className="spinner-text">{status}</span>
        ) : (
          <span>
            クリックしてレシート画像を選択
            <small>スマホで撮影した写真もそのまま選べます（複数可）</small>
          </span>
        )}
      </label>
      {errors.map((msg) => (
        <p key={msg} className="error">
          {msg}
        </p>
      ))}
      {warnings.map((msg) => (
        <p key={msg} className="warning upload-warning">
          {msg}
        </p>
      ))}
    </section>
  );
}
