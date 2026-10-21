import { $, esc } from './util.js';
import { icon, notify } from './ui.js';
import { current, save, syncPhotoToLibrary } from './store.js';
import { renderPreview } from './preview.js';
import { renderers } from './renderers.js';

export function renderPhotoEditor() {
  const b = current().basics;
  return `<div class="photo-editor"><div class="photo-thumbnail">${b.photo ? `<img src="${esc(b.photo)}" alt="当前简历照片">` : `${icon('user')}<span>简历照片</span>`}</div><div class="photo-actions"><strong>简历照片</strong><p>JPG、PNG 或 WebP，自动裁切为 4:5。</p><button class="btn" id="upload-photo">${b.photo ? '替换照片' : '上传照片'}</button>${b.photo ? `<button class="btn quiet" id="remove-photo">移除</button><label class="photo-crop-label">裁切位置 <select id="photo-position"><option value="center" ${b.photoPosition === 'center' ? 'selected' : ''}>居中</option><option value="top" ${b.photoPosition === 'top' ? 'selected' : ''}>靠上</option><option value="bottom" ${b.photoPosition === 'bottom' ? 'selected' : ''}>靠下</option></select></label>` : ''}</div></div>`;
}
export function bindPhotoEditor() {
  $('#upload-photo').onclick = () => $('#photo-file').click();
  if ($('#remove-photo'))
    $('#remove-photo').onclick = () => {
      current().basics.photo = '';
      current().basics.photoOriginal = '';
      syncPhotoToLibrary();
      save();
      renderers.renderEditor();
      renderPreview();
    };
  if ($('#photo-position'))
    $('#photo-position').onchange = async (e) => {
      current().basics.photoPosition = e.target.value;
      await cropPhoto();
      syncPhotoToLibrary();
      save();
      renderers.renderEditor();
      renderPreview();
    };
}
async function loadImage(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('无法解码图片，请使用 JPG、PNG 或 WebP。'));
    im.src = src;
  });
}
async function cropPhoto() {
  const b = current().basics;
  if (!b.photoOriginal && !b.photo) return;
  const im = await loadImage(b.photoOriginal || b.photo);
  const ratio = 4 / 5;
  let sw = im.width,
    sh = im.height,
    sx = 0,
    sy = 0;
  if (im.width / im.height > ratio) {
    sw = im.height * ratio;
    sx = (im.width - sw) / 2;
  } else {
    sh = im.width / ratio;
    sy =
      b.photoPosition === 'top'
        ? 0
        : b.photoPosition === 'bottom'
          ? im.height - sh
          : (im.height - sh) / 2;
  }
  const c = document.createElement('canvas');
  c.width = 360;
  c.height = 450;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(im, sx, sy, sw, sh, 0, 0, c.width, c.height);
  b.photo = c.toDataURL('image/jpeg', 0.9);
}
export function initPhotoUpload() {
  const input = $('#photo-file');
  if (!input) return;
  input.onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    let url;
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type))
        throw new Error('请使用 JPG、PNG 或 WebP。');
      if (f.size > 10 * 1024 * 1024) throw new Error('照片请小于 10 MB。');
      url = URL.createObjectURL(f);
      const im = await loadImage(url);
      const c = document.createElement('canvas'),
        ratio = Math.min(1, 1000 / Math.max(im.width, im.height));
      c.width = Math.round(im.width * ratio);
      c.height = Math.round(im.height * ratio);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(im, 0, 0, c.width, c.height);
      current().basics.photoOriginal = c.toDataURL('image/jpeg', 0.85);
      current().basics.photoPosition = 'center';
      await cropPhoto();
      syncPhotoToLibrary();
      save();
      renderers.renderEditor();
      renderPreview();
      notify('照片已同步到所有简历。');
    } catch (err) {
      notify(err.message);
    } finally {
      if (url) URL.revokeObjectURL(url);
      e.target.value = '';
    }
  };
}
