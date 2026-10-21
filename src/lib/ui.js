import { $ } from './util.js';

const iconPaths = {
  user: '<circle cx="12" cy="8" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/>',
  education: '<path d="m2 9 10-5 10 5-10 5-10-5Z"/><path d="M6 11v6c4 3 8 3 12 0v-6M22 9v8"/>',
  briefcase:
    '<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M8 6V3h8v3M3 12c5 4 13 4 18 0M10 13h4"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
  sliders:
    '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="white"/><circle cx="16" cy="12" r="2" fill="white"/><circle cx="10" cy="18" r="2" fill="white"/>',
  book: '<path d="M12 5C8 2 4 3 2 4v16c3-2 6-2 10 0 4-2 7-2 10 0V4c-3-2-7-2-10 1ZM12 5v15"/>',
  shield: '<path d="m12 2 8 3v6c0 5-4 9-8 11-4-2-8-6-8-11V5l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  upload: '<path d="M12 16V3m-4 4 4-4 4 4M4 15v6h16v-6"/>',
  download: '<path d="M12 3v13m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  file: '<path d="M14 2H5v20h14V7l-5-5ZM14 2v6h5M8 12h8M8 16h8"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
};

let toastTimer;

export function icon(n) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[n] || iconPaths.file}</svg>`;
}

export function icons() {
  document.querySelectorAll('[data-icon]').forEach((e) => (e.innerHTML = icon(e.dataset.icon)));
}

export function notify(t) {
  $('#toast').textContent = t;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3500);
}

export function openModal(html) {
  $('#modal-body').innerHTML = `<div class="modal-content">${html}</div>`;
  $('#modal').showModal();
  $('#modal')
    .querySelectorAll('[data-close]')
    .forEach((e) => (e.onclick = () => $('#modal').close()));
}
