/**
 * Pictures of custom cards, re-encoded by the app before they are stored:
 * - at most MAX_SIDE pixels wide or high, so that sets stay small;
 * - drawn on a canvas and saved again as WebP (PNG where the browser can't
 *   write WebP), which removes metadata such as GPS positions from photos,
 *   and turns SVG pictures (which could contain scripts) into plain images.
 */
export const MAX_SIDE = 512;
/** Files larger than this are skipped. */
export const MAX_PICTURE_BYTES = 15 * 1024 * 1024;
export const PICTURE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif', 'image/bmp'];

function load(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Not a picture'));
    };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, 0.85));
}

/** The picture, resized and re-encoded. Rejects if it isn't a picture. */
export async function normalizeImage(blob: Blob): Promise<Blob> {
  if (blob.size > MAX_PICTURE_BYTES) throw new Error('Too large');
  const img = await load(blob);
  let w = img.naturalWidth || MAX_SIDE;
  let h = img.naturalHeight || MAX_SIDE;
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  w = Math.max(1, Math.round(w * scale));
  h = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
  const webp = await toBlob(canvas, 'image/webp');
  if (webp && webp.type === 'image/webp') return webp;
  const png = await toBlob(canvas, 'image/png');
  if (!png) throw new Error('Could not encode');
  return png;
}
