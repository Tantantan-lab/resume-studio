import { $, esc, clone } from './util.js';
import { openModal, notify } from './ui.js';
import { store, persistActive, KEY, LIB_KEY, ACTIVE_KEY } from './store.js';
import { resumeName } from './resume-utils.js';
import { renderPreview } from './preview.js';
import { renderers } from './renderers.js';

function openLibraryResume(id) {
  const entry = store.library.find((x) => x.id === id);
  if (!entry) return;
  store.previewResumeId = id;
  if (id !== store.activeResumeId) {
    persistActive();
    store.activeResumeId = id;
    store.state = clone(entry.state);
    try {
      localStorage.setItem(ACTIVE_KEY, id);
      localStorage.setItem(KEY, JSON.stringify(store.state));
    } catch {}
  }
  store.section = 'basics';
  renderers.renderEditor();
  renderPreview();
  notify('已进入修改：' + resumeName(entry));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function selectLibraryResume(id) {
  if (!store.library.some((x) => x.id === id)) return;
  store.previewResumeId = id;
  renderLibrary();
  renderPreview();
}
function newLibraryResume() {
  persistActive();
  const now = Date.now();
  const entry = {
    id: crypto.randomUUID(),
    state: clone(store.state),
    region: '深圳',
    note: '新版本',
    createdAt: now,
    updatedAt: now,
  };
  store.library.unshift(entry);
  store.activeResumeId = entry.id;
  store.previewResumeId = entry.id;
  try {
    localStorage.setItem(LIB_KEY, JSON.stringify(store.library));
    localStorage.setItem(ACTIVE_KEY, store.activeResumeId);
    localStorage.setItem(KEY, JSON.stringify(store.state));
  } catch {}
  store.section = 'basics';
  renderers.renderEditor();
  renderPreview();
  notify('已新建简历；修改求职意向和期望薪资后，名称会自动更新。');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function deleteLibraryResume(id) {
  const entry = store.library.find((x) => x.id === id);
  if (!entry) return;
  if (store.library.length <= 1) {
    notify('至少保留一份简历。');
    return;
  }
  openModal(
    `<h2>删除这份简历？</h2><p>${esc(resumeName(entry))}</p><p>删除后无法恢复；建议先在当前简历里导出 JSON 备份。</p><div class="modal-actions"><button class="btn" data-close>取消</button><button class="btn primary" id="confirm-delete-resume">删除</button></div>`,
  );
  $('#confirm-delete-resume').onclick = () => {
    store.library = store.library.filter((x) => x.id !== id);
    try {
      localStorage.setItem(LIB_KEY, JSON.stringify(store.library));
    } catch {}
    if (store.activeResumeId === id) {
      if (store.library.length) {
        store.activeResumeId = store.library[0].id;
        store.state = clone(store.library[0].state);
        try {
          localStorage.setItem(ACTIVE_KEY, store.activeResumeId);
          localStorage.setItem(KEY, JSON.stringify(store.state));
        } catch {}
      } else {
        store.activeResumeId = null;
        try {
          localStorage.removeItem(ACTIVE_KEY);
        } catch {}
      }
    }
    if (store.previewResumeId === id)
      store.previewResumeId = store.activeResumeId || store.library[0]?.id || null;
    $('#modal').close();
    renderers.renderEditor();
    renderPreview();
    notify('已删除简历。');
  };
}
export function renderLibrary() {
  const lc = $('#library-count');
  if (lc) lc.textContent = store.library.length;
  if (!store.previewResumeId || !store.library.some((x) => x.id === store.previewResumeId))
    store.previewResumeId = store.activeResumeId || store.library[0]?.id || null;
  const cards = store.library
    .map((entry) => {
      const active = entry.id === store.activeResumeId;
      const previewing = entry.id === store.previewResumeId;
      const lang = entry.state.language === 'en' ? 'English' : '中文';
      const updated = new Date(entry.updatedAt).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      return `<div class="resume-card${active ? ' is-active' : ''}${previewing ? ' is-preview' : ''}"><button class="resume-card-open" data-preview="${entry.id}"><span class="resume-card-name">${esc(resumeName(entry))}</span><span class="resume-card-meta">${lang} · 更新于 ${esc(updated)}${active ? ' · <b>当前编辑</b>' : ''}${previewing ? ' · <b>预览中</b>' : ''}</span></button><div class="resume-card-actions"><button class="btn" data-edit="${entry.id}">修改</button><button class="icon-btn" data-delete="${entry.id}" aria-label="删除简历">×</button></div></div>`;
    })
    .join('');
  $('#editor').innerHTML =
    `<div class="editor-card library-card"><div class="library-head"><div><span class="overline">MY RESUMES</span><h2>我的简历</h2><p>点击卡片预览右侧内容，需要修改时点「修改」。</p></div><button class="btn primary" id="new-resume">＋ 新建简历</button></div><div class="library-list">${cards || '<div class="library-empty">还没有简历，点击「新建简历」开始。</div>'}</div><div class="library-note">每个版本独立保存；点击卡片只预览，点「修改」进入编辑。切换版本前，当前修改会自动保存。</div></div>`;
  $('#new-resume').onclick = newLibraryResume;
  $('#editor')
    .querySelectorAll('[data-preview]')
    .forEach((e) => (e.onclick = () => selectLibraryResume(e.dataset.preview)));
  $('#editor')
    .querySelectorAll('[data-edit]')
    .forEach((e) => (e.onclick = () => openLibraryResume(e.dataset.edit)));
  $('#editor')
    .querySelectorAll('[data-delete]')
    .forEach(
      (e) =>
        (e.onclick = (ev) => {
          ev.stopPropagation();
          deleteLibraryResume(e.dataset.delete);
        }),
    );
  document
    .querySelectorAll('.nav-item')
    .forEach((e) => e.classList.toggle('active', e.dataset.section === store.section));
}
