import { useEffect, useState } from 'react';

/**
 * ローカルストレージと同期する state
 * ページをリロードしても値が保持される
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? JSON.parse(saved) : initialValue;
    } catch {
      // 保存データが壊れている・ストレージが使えない場合は初期値を使う
      return initialValue;
    }
  });

  // 値が変わるたびにローカルストレージへ保存する
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error('ローカルストレージへの保存に失敗しました:', err);
    }
  }, [key, value]);

  return [value, setValue];
}
