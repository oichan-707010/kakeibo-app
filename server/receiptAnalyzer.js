import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { CATEGORIES } from '../shared/categories.js';

// 使用するモデル（Claude Haiku の最新バージョン）
const MODEL = 'claude-haiku-5-5';

// APIキーは環境変数 ANTHROPIC_API_KEY から自動で読み込まれる
const client = new Anthropic();

// Claude に返してもらうレシートデータの形式
const ReceiptSchema = z.object({
  storeName: z.string().describe('店名。読み取れない場合は空文字'),
  date: z.string().describe('購入日（YYYY-MM-DD形式）。読み取れない場合は空文字'),
  time: z.string().describe('購入時刻（HH:MM形式・24時間表記）。読み取れない場合は空文字'),
  items: z.array(
    z.object({
      name: z.string().describe('商品名'),
      price: z.number().int().describe('税込金額（円・整数）。値引きはマイナス'),
      category: z.string().describe(`商品のカテゴリ（${CATEGORIES.join('、')} のどれか）`),
    }),
  ),
  total: z.number().int().describe('レシートに記載された合計金額（円・整数）'),
});

// Claude への指示文
const SYSTEM_PROMPT = `あなたは家計簿アプリのレシート読み取り担当です。
レシート画像から店名・購入日時・商品ごとの名前と金額・合計金額を読み取ってください。

- 金額は税込の円単位の整数にしてください。外税のレシートでは、商品ごとの金額に税額を按分して含めてください。
- 値引き・割引の行は、マイナスの金額の項目として含めてください。
- 小計・合計・お預かり・お釣り・ポイントの行は商品に含めないでください。
- 各商品は次のカテゴリのどれかに分類してください: ${CATEGORIES.join('、')}
  - スーパーやコンビニで買った食材・お弁当・お菓子は「食費」
  - 飲食店での食事は「外食」
  - お酒・コーヒー豆・たばこなどは「飲料・嗜好品」
  - 洗剤・ティッシュ・文房具などの消耗品は「日用品」
- 年が書かれていない、または和暦の場合は西暦に直してください。`;

// 画像の内容が読み取れなかったときなどに投げるエラー
export class ReceiptAnalysisError extends Error {}

/**
 * レシート画像を Claude で解析し、構造化されたデータを返す
 * @param {Buffer} imageBuffer 画像データ
 * @param {string} mediaType 画像のMIMEタイプ（image/jpeg など）
 */
export async function analyzeReceipt(imageBuffer, mediaType) {
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: {
      effort: 'medium',
      format: zodOutputFormat(ReceiptSchema),
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBuffer.toString('base64'),
            },
          },
          { type: 'text', text: 'このレシートを読み取ってください。' },
        ],
      },
    ],
  });

  // 安全上の理由で応答が拒否された場合
  if (response.stop_reason === 'refusal') {
    throw new ReceiptAnalysisError('この画像は読み取れませんでした。別の画像でお試しください。');
  }
  // 出力が途中で切れた場合
  if (response.stop_reason === 'max_tokens') {
    throw new ReceiptAnalysisError('レシートが長すぎて読み取りきれませんでした。');
  }
  if (!response.parsed_output) {
    throw new ReceiptAnalysisError('レシートの内容を解析できませんでした。');
  }

  // 一覧にないカテゴリが返ってきた場合は「その他」にする
  const receipt = response.parsed_output;
  receipt.items = receipt.items.map((item) => ({
    ...item,
    category: CATEGORIES.includes(item.category) ? item.category : 'その他',
  }));
  return receipt;
}
