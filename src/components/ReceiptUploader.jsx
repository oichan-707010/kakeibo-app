import { useRef, useState } from 'react';

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
export default function ReceiptUploader({ onAdd }) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState(null); // 進捗メッセージ
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1枚の画像をバックエンドに送り、解析結果を受け取る
  async function analyze(file) {
    const formData = new FormData();
    formData.append('image', file);
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
    const failed = [];

    // 複数枚選ばれた場合は1枚ずつ順番に解析する
    for (const [i, file] of files.entries()) {
      setStatus(`読み取り中… (${i + 1}/${files.length}) ${file.name}`);
      try {
        const result = await analyze(file);
        onAdd({
          id: crypto.randomUUID(),
          storeName: result.storeName || '店名不明',
          // 日付が読み取れなかった場合は今日の日付にする
          date: /^\d{4}-\d{2}-\d{2}$/.test(result.date) ? result.date : today(),
          items: result.items,
          printedTotal: result.total,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        failed.push(`${file.name}: ${err.message}`);
      }
    }

    setErrors(failed);
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
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          disabled={loading}
          onChange={(e) => handleFiles([...e.target.files])}
        />
        {loading ? (
          <span className="spinner-text">{status}</span>
        ) : (
          <span>
            クリックしてレシート画像を選択
            <small>JPEG・PNG・WebP・GIF（5MBまで・複数可）</small>
          </span>
        )}
      </label>
      {errors.map((msg) => (
        <p key={msg} className="error">
          {msg}
        </p>
      ))}
    </section>
  );
}
