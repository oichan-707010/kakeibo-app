import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import { analyzeReceipt, ReceiptAnalysisError } from './receiptAnalyzer.js';

const PORT = process.env.PORT || 3001;
const here = path.dirname(fileURLToPath(import.meta.url));

// Claude API が受け付ける画像形式
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// アップロード画像はディスクに保存せずメモリ上で扱う（1枚 5MB まで）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const app = express();

// レシート画像を受け取り、Claude で解析した結果を返す
app.post('/api/receipts/analyze', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '画像ファイルが送信されていません。' });
  }
  if (!ALLOWED_TYPES.includes(req.file.mimetype)) {
    return res
      .status(400)
      .json({ error: 'JPEG・PNG・WebP・GIF 形式の画像をアップロードしてください。' });
  }

  try {
    const receipt = await analyzeReceipt(req.file.buffer, req.file.mimetype);
    res.json(receipt);
  } catch (err) {
    if (err instanceof ReceiptAnalysisError) {
      return res.status(422).json({ error: err.message });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      console.error('APIキーが無効です。.env の ANTHROPIC_API_KEY を確認してください。');
      return res.status(500).json({ error: 'サーバーの設定に問題があります。' });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: '混み合っています。しばらくしてからお試しください。' });
    }
    console.error('レシート解析中にエラーが発生しました:', err);
    res.status(502).json({ error: 'レシートの読み取りに失敗しました。' });
  }
});

// multer のエラー（ファイルサイズ超過など）を日本語で返す
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: '画像サイズは 5MB 以下にしてください。' });
  }
  next(err);
});

// 本番環境ではビルド済みのフロントエンドも配信する
if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(here, '..', 'dist');
  app.use(express.static(distDir));
  app.get('/{*splat}', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`サーバーを起動しました: http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('警告: ANTHROPIC_API_KEY が設定されていません。.env を作成してください。');
  }
});
