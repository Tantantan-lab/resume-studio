import { $, esc } from './util.js';
import { store, viewState } from './store.js';
import { getPaperTemplate, paperAccent } from './paper-design.js';
import { applyPageFill, FILL_LABELS } from './page-fill.js';

function date(x) {
  return x ? esc(String(x).replace('-', '.')) : '';
}
function range(a, b) {
  return a || b ? `${date(a)}${a && b ? ' - ' : ''}${date(b)}` : '';
}
function lines(items) {
  return `<ul>${(items || [])
    .filter(Boolean)
    .map((x) => `<li>${esc(x)}</li>`)
    .join('')}</ul>`;
}
export function renderPreview() {
  const vs = viewState(),
    p = vs.profiles[vs.language],
    en = vs.language === 'en';
  const targetLine = [
    p.basics.target ? esc(p.basics.target) : '',
    p.basics.salary ? `${en ? 'Expected Salary: ' : '期望薪资：'}${esc(p.basics.salary)}` : '',
  ]
    .filter(Boolean)
    .join(' &nbsp;|&nbsp; ');
  const template = getPaperTemplate(vs.style.template).id;
  const hasPhoto = Boolean(p.basics.photo) && vs.style.showPhoto !== false;
  const header = `<header class="resume-header ${hasPhoto ? 'has-photo' : ''}">${hasPhoto ? '<div class="header-spacer"></div>' : ''}<div class="resume-identity"><h1>${esc(p.basics.name || (en ? 'YOUR NAME' : '姓名待补充'))}</h1><p class="contacts">${[p.basics.phone || (en ? 'Phone to be added' : '手机待补充'), p.basics.email || (en ? 'Email to be added' : '邮箱待补充'), p.basics.links].filter(Boolean).map(esc).join(' &nbsp;|&nbsp; ')}</p><p class="target">${targetLine}</p></div>${hasPhoto ? `<img class="resume-photo" src="${esc(p.basics.photo)}" alt="${en ? 'Resume photo' : '简历照片'}">` : ''}</header>`;
  const sections = {};
  if (p.education.length)
    sections.education = `<section class="resume-education"><h2>${en ? 'Education' : '教育背景'}</h2>${p.education.map((x) => `<div class="item"><div class="resume-row"><strong>${esc(x.school)}</strong><span class="date">${range(x.start, x.end)}</span></div><p class="qual">${[x.major, x.degree, x.gpa ? 'GPA ' + x.gpa : '', x.rank].filter(Boolean).map(esc).join(' &nbsp;|&nbsp; ')}</p>${x.courses ? `<p>${en ? 'Coursework: ' : '主修课程：'}${esc(x.courses)}</p>` : ''}</div>`).join('')}</section>`;
  if (p.experience.length)
    sections.experience = `<section class="resume-experience"><h2>${en ? 'Experience' : '工作经历'}</h2>${p.experience.map((x) => `<div class="item"><div class="resume-row"><strong>${esc(x.company)}${x.role ? ' | ' + esc(x.role) : ''}</strong><span class="date">${range(x.start, x.end)}</span></div>${lines(x.bullets)}</div>`).join('')}</section>`;
  if (p.projects.length)
    sections.projects = `<section class="resume-projects"><h2>${en ? 'Projects' : '项目经历'}</h2>${p.projects.map((x) => `<div class="item"><div class="resume-row"><strong>${esc(x.title)}${x.award && !en ? ' | ' + esc(x.award) : ''}</strong><span class="date">${range(x.start, x.end)}</span></div>${x.award && en ? `<p class="award">${esc(x.award)}</p>` : ''}${lines(x.bullets)}</div>`).join('')}</section>`;
  if (p.skills.length)
    sections.skills = `<section class="resume-skills"><h2>${en ? 'Skills' : '专业技能'}</h2>${p.skills.map((x) => `<p class="skill"><strong>${esc(x.label)}${en ? ': ' : '：'}</strong>${esc(x.text)}</p>`).join('')}</section>`;
  const body =
    template === 'sidebar'
      ? `<div class="resume-columns"><aside class="resume-side">${(sections.education || '') + (sections.skills || '')}</aside><div class="resume-main">${(sections.experience || '') + (sections.projects || '')}</div></div>`
      : `<div class="resume-body">${Object.values(sections).join('')}</div>`;
  const preview = $('#resume-preview');
  preview.innerHTML = header + body;
  preview.dataset.template = template;
  preview.dataset.language = vs.language;
  preview.style.setProperty('--resume-accent', paperAccent(vs.style.accent));
  const safeFamily = (x) => String(x).replace(/["'<>;\\]/g, '');
  preview.style.setProperty(
    '--resume-title-font',
    `"${safeFamily(vs.style.fontEN)}","${safeFamily(vs.style.fontCN)}",serif`,
  );
  preview.style.fontFamily = `"${safeFamily(vs.style.fontEN)}","${safeFamily(vs.style.fontCN)}",sans-serif`;
  preview.style.fontSize = vs.style.bodySize + 'pt';
  preview.style.lineHeight = vs.style.lineHeight;
  preview.style.padding = vs.style.marginMm + 'mm';
  preview.style.color = '#202734';
  preview.querySelector('h1').style.fontSize = vs.style.titleSize + 'pt';
  const fillState = applyPageFill(preview, vs.style.fillPage === true);
  const fillStatus = $('#paper-fill-status');
  if (fillStatus) fillStatus.textContent = FILL_LABELS[fillState];
  preview.style.transform = `scale(${store.scale})`;
  preview.style.transformOrigin = 'top left';
  requestAnimationFrame(() => {
    const w = preview.offsetWidth,
      h = preview.offsetHeight;
    $('#sheet-wrap').style.width = w * store.scale + 'px';
    $('#sheet-wrap').style.height = h * store.scale + 'px';
    const pages = Math.max(1, Math.ceil(h / 1122.6 - 0.015));
    $('#page-status').textContent = pages === 1 ? '一页预览' : `约 ${pages} 页`;
    $('#zoom-label').textContent = Math.round(store.scale * 100) + '%';
  });
  $('#font-summary').textContent = `${vs.style.bodySize}pt · ${vs.style.fontEN}`;
  const langToggle = $('#lang-toggle');
  if (langToggle) {
    langToggle.dataset.activeLang = en ? 'en' : 'zh';
    langToggle.setAttribute('aria-pressed', String(en));
    langToggle.title = en
      ? '切换到中文简历 / Switch to Chinese'
      : '切换英文简历 / Switch to English';
  }
  const langSwitch = document.querySelector('.language-switch');
  if (langSwitch) langSwitch.style.display = store.section === 'library' ? 'none' : '';
  const titleInput = $('#document-title');
  titleInput.value = vs.meta?.title || '';
  titleInput.disabled = store.section === 'library';
  document.title = vs.meta?.title || '简历工坊 · Resume Studio';
  syncPrintRoot();
}
export function syncPrintRoot() {
  const paper = $('#resume-preview').cloneNode(true);
  paper.removeAttribute('id');
  paper.style.transform = 'none';
  $('#print-root').replaceChildren(paper);
}

export function fitPreviewToSpace() {
  const stage = document.querySelector('.paper-stage');
  if (stage) {
    const css = getComputedStyle(stage);
    const available =
      stage.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
    store.scale = Math.max(0.2, Math.min(0.65, available / ((210 * 96) / 25.4)));
  }
  renderPreview();
}
