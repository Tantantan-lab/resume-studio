export function canvasBlob(canvas) {
  return new Promise((res, rej) =>
    canvas.toBlob(
      (b) => (b ? res(b) : rej(new Error('图片生成失败，请改用可编辑 Word。'))),
      'image/png',
    ),
  );
}

export async function renderPreviewCanvas() {
  const source = document.querySelector('#resume-preview');
  const clone = source.cloneNode(true);
  clone.removeAttribute('id');
  clone.style.transform = 'none';
  clone.style.margin = '0';
  clone.style.boxShadow = 'none';
  const css = [...document.styleSheets]
    .flatMap((s) => {
      try {
        return [...s.cssRules].map((r) => r.cssText);
      } catch {
        return [];
      }
    })
    .join('\n');
  const width = Math.round((210 * 96) / 25.4);
  const height = Math.max(Math.round((297 * 96) / 25.4), source.scrollHeight, source.offsetHeight);
  // Vite's CSS minifier may emit modern range queries (`width <= ...`).
  // `<` is illegal in XML text, so escape it before inline SVG serialization.
  const safeCss = css.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const wrapper = `<div xmlns="http://www.w3.org/1999/xhtml" style="margin:0;padding:0;background:#fff;"><style>${safeCss}</style>${new XMLSerializer().serializeToString(clone)}</div>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject width="100%" height="100%">${wrapper}</foreignObject></svg>`;
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const img = await new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('图片渲染失败，请改用可编辑 Word。'));
    im.src = url;
  });
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0, width, height);
  return { canvas, width, height, scale };
}

export async function renderPreviewPages() {
  const { canvas, scale } = await renderPreviewCanvas();
  const pageH = Math.round(1123 * scale);
  const pages = [];
  for (let y = 0; y < canvas.height; y += pageH) {
    const c = document.createElement('canvas');
    c.width = canvas.width;
    c.height = pageH;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(canvas, 0, -y);
    const blob = await canvasBlob(c);
    pages.push({
      bytes: new Uint8Array(await blob.arrayBuffer()),
      width: c.width,
      height: c.height,
    });
  }
  return pages;
}
