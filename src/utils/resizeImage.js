// 縮小後の長辺の最大ピクセル数（文字が読める程度の解像度は残す）
const MAX_SIDE = 2000;
// JPEG の画質（0〜1）
const QUALITY = 0.85;
// これより小さい JPEG・PNG はそのまま送る
const SKIP_BYTES = 1 * 1024 * 1024;

// 画像ファイルを描画できる形に読み込む（スマホ写真の向き情報も反映する）
async function loadImage(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // 対応していない場合は下の方法で読み込む
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * アップロード前に画像を縮小し、JPEG に変換する
 * スマホで撮影した大きな写真や HEIC 形式の画像も送れるようにするため
 */
export async function resizeImage(file) {
  if (['image/jpeg', 'image/png'].includes(file.type) && file.size <= SKIP_BYTES) {
    return file;
  }

  let image;
  try {
    image = await loadImage(file);
  } catch {
    throw new Error('この画像形式は読み込めませんでした。JPEG または PNG でお試しください。');
  }

  // 長辺が MAX_SIDE を超える場合だけ縮小する
  const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  // 透過 PNG の背景が黒くならないよう白で塗っておく
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  image.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
  if (!blob) {
    throw new Error('画像の変換に失敗しました。');
  }
  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], name, { type: 'image/jpeg' });
}
