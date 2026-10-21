import { $, esc, clone } from './util.js';
import { openModal, notify } from './ui.js';
import { store, snapshot, save } from './store.js';
import { renderPreview } from './preview.js';
import { renderers } from './renderers.js';

export function renderVersions() {
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
        renderers.renderEditor();
        renderPreview();
        $('#modal').close();
        notify('已恢复版本。');
      }),
  );
}
