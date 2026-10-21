import { clone, $ } from './util.js';
import { notify } from './ui.js';
import { autoResumeName } from './resume-utils.js';
import { defaultState, demoRegion, demoRoles } from '../demo/data.js';
import { createDemoState } from '../demo/demo-content.js';

export const KEY = 'resume-studio.v1';
export const LIB_KEY = KEY + '.library';
export const ACTIVE_KEY = KEY + '.active';
export const VERSIONS_KEY = KEY + '.versions';

export const store = {
  state: clone(defaultState),
  library: [],
  activeResumeId: null,
  previewResumeId: null,
  section: 'basics',
  scale: 0.65,
  versions: [],
  librarySeeded: false,
};

let saveTimer;

export function current() {
  return store.state.profiles[store.state.language];
}

export function viewState() {
  return store.section === 'library' && store.previewResumeId
    ? store.library.find((x) => x.id === store.previewResumeId)?.state || store.state
    : store.state;
}

export function save() {
  clearTimeout(saveTimer);
  $('#save-status').textContent = '正在保存…';
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(store.state));
      if (store.activeResumeId) {
        const entry = store.library.find((x) => x.id === store.activeResumeId);
        if (entry) {
          entry.state = clone(store.state);
          entry.updatedAt = Date.now();
          localStorage.setItem(LIB_KEY, JSON.stringify(store.library));
        }
      }
      $('#save-status').textContent = '已保存到本机';
    } catch {
      $('#save-status').textContent = '本机存储已满，请导出 JSON';
    }
  }, 350);
}

export function persistActive() {
  if (!store.activeResumeId) return;
  const entry = store.library.find((x) => x.id === store.activeResumeId);
  if (!entry) return;
  entry.state = clone(store.state);
  entry.updatedAt = Date.now();
  try {
    localStorage.setItem(LIB_KEY, JSON.stringify(store.library));
  } catch {}
}

export function applyPhotoToState(target, source) {
  for (const lang of ['zh', 'en']) {
    const basics = target?.profiles?.[lang]?.basics;
    if (!basics) continue;
    basics.photo = source.photo || '';
    basics.photoOriginal = source.photoOriginal || '';
    basics.photoPosition = source.photoPosition || 'center';
  }
}

export function syncPhotoToLibrary() {
  const source = current().basics || {};
  applyPhotoToState(store.state, source);
  store.library.forEach((entry) => {
    applyPhotoToState(entry.state, source);
    entry.updatedAt = Date.now();
  });
  try {
    localStorage.setItem(LIB_KEY, JSON.stringify(store.library));
  } catch {}
}

export function snapshot(label) {
  store.versions.unshift({
    id: Date.now(),
    label,
    state: clone(store.state),
    time: new Date().toLocaleString('zh-CN'),
  });
  store.versions = store.versions.slice(0, 8);
  try {
    localStorage.setItem(VERSIONS_KEY, JSON.stringify(store.versions));
  } catch {
    notify('版本存储空间不足，请保存 JSON 数据。');
  }
}

export function seedLibrary() {
  const now = Date.now();
  const isNewDemo =
    store.state.profiles?.zh?.basics?.name === '陈知遥' &&
    store.state.profiles?.zh?.basics?.email === 'zhiyao.chen@example.com';
  const region = isNewDemo ? demoRegion : '深圳';
  const currentEntry = {
    id: crypto.randomUUID(),
    state: clone(store.state),
    region,
    note: isNewDemo ? '虚构演示 · 当前版本' : '当前版本',
    createdAt: now,
    updatedAt: now,
  };
  if (!currentEntry.state.meta) currentEntry.state.meta = {};
  if (!currentEntry.state.meta.title || currentEntry.state.meta.title === '我的海外运营简历') {
    currentEntry.state.meta.title = autoResumeName(
      currentEntry.state.profiles?.[currentEntry.state.language] || currentEntry.state.profiles?.zh,
      region,
    );
  }
  const variants = demoRoles.map((_, index) => ({
    id: crypto.randomUUID(),
    state: createDemoState(index),
    region: demoRegion,
    note: '虚构演示',
    createdAt: now,
    updatedAt: now,
  }));
  store.library = [...variants, currentEntry];
  store.activeResumeId = variants[0].id;
  store.state = clone(variants[0].state);
  store.librarySeeded = true;
  try {
    localStorage.setItem(LIB_KEY, JSON.stringify(store.library));
    localStorage.setItem(ACTIVE_KEY, store.activeResumeId);
    localStorage.setItem(KEY, JSON.stringify(store.state));
  } catch {}
}

export function loadPersistedState() {
  try {
    const cached = JSON.parse(localStorage.getItem(KEY));
    if (cached?.version === 1 && cached.profiles?.zh && cached.profiles?.en) {
      store.state = cached;
    }
  } catch {}
  try {
    store.versions = JSON.parse(localStorage.getItem(VERSIONS_KEY)) || [];
  } catch {
    store.versions = [];
  }
}

export function loadLibrary() {
  try {
    const raw = localStorage.getItem(LIB_KEY);
    if (raw === null) {
      seedLibrary();
      return;
    }
    store.library = JSON.parse(raw) || [];
    store.activeResumeId = localStorage.getItem(ACTIVE_KEY);
    if (!store.library.some((entry) => entry.id === store.activeResumeId)) {
      store.activeResumeId = store.library[0]?.id || null;
    }
  } catch {
    store.library = [];
  }
}
