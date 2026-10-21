import { $ } from './lib/util.js';
import { icon, icons, notify, openModal } from './lib/ui.js';
import { store, save, loadPersistedState, loadLibrary } from './lib/store.js';
import { runEarlyMigrations, runLateMigrations } from './lib/migrations.js';
import { renderPreview, syncPrintRoot } from './lib/preview.js';
import { initPhotoUpload } from './lib/photo.js';
import { renderers } from './lib/renderers.js';
import { renderEditor, initFontImport } from './lib/editor.js';
import { renderLibrary } from './lib/library.js';
import { renderVersions } from './lib/versions.js';
import { initImport } from './lib/import-ui.js';
import { initDownloadMenu } from './lib/download-menu.js';
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
    `<h2>从一份材料，到多版简历</h2><ol><li>导入 Word、JSON 或文本。Word 导入后需核对识别结果。</li><li>按模块编辑内容，分别完善中文与英文版本。</li><li>在“字体与排版”调整字体、字号、行距和页边距。</li><li>点击右上角「下载」，可选择与预览一致的 Word/PDF、可编辑 Word、图片或 JSON。</li><li>PDF（图片版）直接生成；PDF（文字版）在打印窗口另存，文字可复制/搜索；可编辑 Word 排版为近似值；JSON 可完整保留双语内容和版式。</li></ol><p>岗位词库来自公开招聘摘录，不代表你已具备所有技能。字体完全一致需使用参考 PDF 核对，并确保本机已安装对应字体。</p><div class="modal-actions"><button class="btn primary" data-close>知道了</button></div>`,
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
initImport();
initDownloadMenu();
renderEditor();
renderPreview();
setTimeout(() => {
  if (store.librarySeeded) notify('已载入 5 个虚构岗位演示。人物、机构、经历与数据均为示例。');
}, 900);

window.addEventListener('resume-io-warning', (e) =>
  notify(e.detail?.message || '导出时有内容需检查。'),
);
