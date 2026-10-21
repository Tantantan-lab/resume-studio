import { exportJson, exportDocx, exportDocxImage, exportPdfImage, exportPrint } from '../io.js';
import { exportFilename } from './resume-utils.js';
import { downloadBlob } from './download.js';
import { canvasBlob, renderPreviewCanvas, renderPreviewPages } from './visual-export.js';
import { $ } from './util.js';
import { notify } from './ui.js';
import { viewState } from './store.js';
import { syncPrintRoot } from './preview.js';

export function initDownloadMenu() {
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
    downloadBlob(blob, exportFilename(vs, 'png'));
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
            } else if (type === 'pdf-text') {
              syncPrintRoot();
              notify('请在打印窗口选择“另存为 PDF”；文字可复制、搜索。');
              exportPrint();
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
}
