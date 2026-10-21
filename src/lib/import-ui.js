import { importFile } from '../io.js';
import { $, esc, clone } from './util.js';
import { openModal, notify } from './ui.js';
import { store, current, snapshot, save } from './store.js';
import { renderPreview } from './preview.js';
import { renderers } from './renderers.js';

export function initImport() {
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
            title:
              store.state.language === 'zh' ? '导入内容 待整理' : 'Imported content to organize',
            award: '',
            start: '',
            end: '',
            bullets: $('#import-review').value.split('\n').filter(Boolean),
          });
        save();
        store.section = 'projects';
        renderers.renderEditor();
        renderPreview();
        $('#modal').close();
        notify('已导入，请检查分区、日期和内容。');
      };
    } else if (result.state) {
      snapshot('导入前备份');
      store.state = result.state;
      save();
      renderers.renderEditor();
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
}
