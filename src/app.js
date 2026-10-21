import { exportJson, exportDocx, exportDocxImage, exportPdfImage, importFile } from './io.js';
import { fileBase } from './lib/resume-utils.js';
import { downloadBlob } from './lib/download.js';
import { canvasBlob, renderPreviewCanvas, renderPreviewPages } from './lib/visual-export.js';
import { $, esc, clone } from './lib/util.js';
import { icon, icons, notify, openModal } from './lib/ui.js';
import {
  store,
  current,
  viewState,
  save,
  snapshot,
  loadPersistedState,
  loadLibrary,
} from './lib/store.js';
import { runEarlyMigrations, runLateMigrations } from './lib/migrations.js';
import { renderPreview, syncPrintRoot } from './lib/preview.js';
import { initPhotoUpload } from './lib/photo.js';
import { renderers } from './lib/renderers.js';
import { renderEditor, initFontImport } from './lib/editor.js';
import { renderLibrary } from './lib/library.js';
loadPersistedState();
runEarlyMigrations();
loadLibrary();
runLateMigrations();
const modules = [
  ['basics', '基本信息', 'user', '01'],
  ['education', '教育背景', 'education', '02'],
  ['experience', '工作经历', 'briefcase', '03'],
  ['projects', '项目经历', 'layers', '04'],
  ['skills', '专业技能', 'spark', '05'],
];
$('#module-nav').innerHTML = modules
  .map(
    ([id, label, ic]) =>
      `<button class="nav-item" data-section="${id}"><span>${icon(ic)}</span><span>${label}</span></button>`,
  )
  .join('');
icons();
function renderVersions() {
  openModal(
    `<h2>本机版本记录</h2><p>版本只保存在当前浏览器，导出 JSON 可以跨设备继续编辑。</p><button class="btn primary" id="save-version">保存当前版本</button><div>${store.versions.length ? store.versions.map((v, i) => `<div class="version-row"><div><strong>${esc(v.label)}</strong><small>${esc(v.time)}</small></div><button class="btn" data-restore="${i}">恢复</button></div>`).join('') : '<p>还没有手动保存的版本。</p>'}</div><div class="modal-actions"><button class="btn" data-close>关闭</button></div>`,
  );
  $('#save-version').onclick = () => {
    snapshot(store.state.meta.title);
    renderVersions();
    notify('当前版本已保存。');
  };
  document.querySelectorAll('[data-restore]').forEach(
    (e) =>
      (e.onclick = () => {
        const s = clone(store.versions[+e.dataset.restore].state);
        snapshot('恢复前备份');
        store.state = s;
        save();
        renderEditor();
        renderPreview();
        $('#modal').close();
        notify('已恢复版本。');
      }),
  );
}
function showImport(result) {
  if (result.rawText) {
    openModal(
      `<h2>核对导入内容</h2><p>已提取文本。${result.state ? '可以使用识别出的结构化草稿，请对照原文检查。' : '原文件未能可靠识别为分区，将保留为一条待整理项目。'}</p>${result.warnings?.length ? `<p>${result.warnings.map(esc).join('<br>')}</p>` : ''}<textarea class="modal-text" id="import-review" aria-label="导入原文">${esc(result.rawText)}</textarea><div class="modal-actions"><button class="btn" data-close>取消</button><button class="btn primary" id="confirm-import">${result.state ? '导入识别草稿' : '保留文本并导入'}</button></div>`,
    );
    $('#confirm-import').onclick = () => {
      snapshot('导入前备份');
      if (result.state) store.state = result.state;
      else
        current().projects.push({
          id: crypto.randomUUID(),
          title: store.state.language === 'zh' ? '导入内容 待整理' : 'Imported content to organize',
          award: '',
          start: '',
          end: '',
          bullets: $('#import-review').value.split('\n').filter(Boolean),
        });
      save();
      store.section = 'projects';
      renderEditor();
      renderPreview();
      $('#modal').close();
      notify('已导入，请检查分区、日期和内容。');
    };
  } else if (result.state) {
    snapshot('导入前备份');
    store.state = result.state;
    save();
    renderEditor();
    renderPreview();
    notify(result.warnings?.join('；') || '双语数据已导入。');
  } else notify(result.warnings?.join('；') || '文件没有可导入的内容。');
}
$('#import-btn').onclick = () => $('#import-file').click();
$('#import-file').onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    notify('正在读取文件…');
    showImport(await importFile(f, clone(store.state)));
  } catch (err) {
    notify('导入失败：' + (err.message || '文件格式不支持'));
  }
  e.target.value = '';
};
const downloadBtn = $('#download-btn'),
  downloadMenu = $('#download-options');
function closeDownload() {
  if (!downloadMenu) return;
  downloadMenu.hidden = true;
  downloadBtn.setAttribute('aria-expanded', 'false');
}
async function exportPng() {
  const vs = viewState();
  const { canvas } = await renderPreviewCanvas();
  const blob = await canvasBlob(canvas);
  downloadBlob(blob, `${fileBase(vs)}.png`);
}
if (downloadBtn) {
  downloadBtn.onclick = (e) => {
    e.stopPropagation();
    const open = downloadMenu.hidden;
    downloadMenu.hidden = !open;
    downloadBtn.setAttribute('aria-expanded', String(open));
  };
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.download-menu')) closeDownload();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDownload();
  });
  downloadMenu.querySelectorAll('[data-export]').forEach(
    (item) =>
      (item.onclick = async () => {
        const type = item.dataset.export;
        closeDownload();
        downloadBtn.disabled = true;
        try {
          if (type === 'json') {
            exportJson(viewState());
            notify('已保存完整双语数据与排版设置。');
          } else if (type === 'word-visual') {
            const pages = await renderPreviewPages();
            await exportDocxImage(viewState(), pages);
            notify('Word 已生成（与预览一致）。');
          } else if (type === 'word') {
            await exportDocx(viewState());
            notify('可编辑 Word 已生成（排版近似）。');
          } else if (type === 'pdf') {
            const pages = await renderPreviewPages();
            await exportPdfImage(viewState(), pages);
            notify('PDF 已生成（与预览一致）。');
          } else if (type === 'png') {
            notify('正在生成图片…');
            await exportPng();
            notify('图片已生成。');
          }
        } catch (e) {
          notify('导出失败：' + (e.message || '请重试'));
        } finally {
          downloadBtn.disabled = false;
        }
      }),
  );
}
$('#version-btn').onclick = renderVersions;
$('#document-title').oninput = (e) => {
  store.state.meta.title = e.target.value;
  save();
};
$('a.brand').onclick = (e) => e.preventDefault();
$$nav();
function $$nav() {
  document.querySelectorAll('[data-section]').forEach(
    (e) =>
      (e.onclick = () => {
        store.section = e.dataset.section;
        renderEditor();
      }),
  );
  const langToggle = $('#lang-toggle');
  if (langToggle)
    langToggle.onclick = () => {
      store.state.language = store.state.language === 'zh' ? 'en' : 'zh';
      save();
      renderEditor();
      renderPreview();
    };
}
$('#zoom-in').onclick = () => {
  store.scale = Math.min(1, +(store.scale + 0.05).toFixed(2));
  renderPreview();
};
$('#zoom-out').onclick = () => {
  store.scale = Math.max(0.35, +(store.scale - 0.05).toFixed(2));
  renderPreview();
};
$('#help-btn').onclick = () =>
  openModal(
    `<h2>从一份材料，到多版简历</h2><ol><li>导入 Word、JSON 或文本。Word 导入后需核对识别结果。</li><li>按模块编辑内容，分别完善中文与英文版本。</li><li>在“字体与排版”调整字体、字号、行距和页边距。</li><li>点击右上角「下载」，可选择与预览一致的 Word/PDF、可编辑 Word、图片或 JSON。</li><li>PDF 直接生成；可编辑 Word 排版为近似值；JSON 可完整保留双语内容和版式，供下次导入复用。</li></ol><p>岗位词库来自公开招聘摘录，不代表你已具备所有技能。字体完全一致需使用参考 PDF 核对，并确保本机已安装对应字体。</p><div class="modal-actions"><button class="btn primary" data-close>知道了</button></div>`,
  );
$('#modal').addEventListener('click', (e) => {
  if (e.target === $('#modal')) $('#modal').close();
});
window.addEventListener('beforeprint', syncPrintRoot);
window.addEventListener('resize', () => renderPreview());
renderers.renderEditor = renderEditor;
renderers.renderLibrary = renderLibrary;
initFontImport();
initPhotoUpload();
renderEditor();
renderPreview();
setTimeout(() => {
  if (store.librarySeeded) notify('已载入 5 个虚构岗位演示。人物、机构、经历与数据均为示例。');
}, 900);

window.addEventListener('resume-io-warning', (e) =>
  notify(e.detail?.message || '导出时有内容需检查。'),
);
