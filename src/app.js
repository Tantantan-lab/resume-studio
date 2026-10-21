import { terminology } from './terms.js';
import { exportJson, exportDocx, exportDocxImage, exportPdfImage, importFile } from './io.js';
import { autoResumeName, resumeName, fileBase } from './lib/resume-utils.js';
import { downloadBlob } from './lib/download.js';
import { canvasBlob, renderPreviewCanvas, renderPreviewPages } from './lib/visual-export.js';
import { $, esc, clone } from './lib/util.js';
import { icon, icons, notify, openModal } from './lib/ui.js';
import {
  store,
  current,
  viewState,
  save,
  persistActive,
  snapshot,
  syncPhotoToLibrary,
  loadPersistedState,
  loadLibrary,
  KEY,
  LIB_KEY,
  ACTIVE_KEY,
} from './lib/store.js';
import { runEarlyMigrations, runLateMigrations } from './lib/migrations.js';
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
  renderEditor();
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
  renderEditor();
  renderPreview();
  notify('已新建简历；修改求职意向和期望薪资后，名称会自动更新。');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function deleteLibraryResume(id) {
  const entry = store.library.find((x) => x.id === id);
  if (!entry) return;
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
    renderEditor();
    renderPreview();
    notify('已删除简历。');
  };
}
function renderLibrary() {
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
function setAt(path, value) {
  const autoKeys = path === 'basics.target' || path === 'basics.salary';
  const entry = store.library.find((x) => x.id === store.activeResumeId);
  const region = entry?.region || '深圳';
  const oldAuto = autoResumeName(current(), region);
  const oldTitle = (store.state.meta?.title || '').trim();
  const p = path.split('.');
  let o = path.startsWith('style.') ? store.state : current();
  for (let i = 0; i < p.length - 1; i++) o = o[p[i]];
  o[p.at(-1)] = value;
  if (autoKeys && (!oldTitle || oldTitle === oldAuto)) {
    store.state.meta = store.state.meta || {};
    store.state.meta.title = autoResumeName(current(), region);
  }
  save();
  renderPreview();
}
function getAt(path) {
  return path
    .split('.')
    .reduce((o, k) => o?.[k], path.startsWith('style.') ? store.state : current());
}
function field(label, path, type = 'text', placeholder = '', help = '') {
  let v = getAt(path) ?? '';
  if (Array.isArray(v)) v = v.join('\n');
  return `<label class="field"><span>${label}</span>${type === 'textarea' ? `<textarea data-path="${path}" placeholder="${esc(placeholder)}">${esc(v)}</textarea>` : `<input type="${type}" data-path="${path}" value="${esc(v)}" placeholder="${esc(placeholder)}" ${type === 'month' ? '' : 'maxlength="600"'}>`}${help ? `<small>${help}</small>` : ''}</label>`;
}
const sectionInfo = {
  basics: ['01 / PROFILE', '基本信息', '先完善联系信息，再让招聘方一眼看到你的求职方向。'],
  education: ['02 / EDUCATION', '教育背景', '优先保留与目标岗位相关的课程和学业表现。'],
  experience: ['03 / EXPERIENCE', '工作经历', '用具体行动、工作产出和可核实的结果说明你做了什么。'],
  projects: ['04 / PROJECTS', '项目经历', '突出与你申请岗位相关的实践，清楚标明模拟项目。'],
  skills: ['05 / SKILLS', '专业技能', '工具写到具体用途，专业词汇与真实经历对应。'],
  style: ['LAYOUT / TYPOGRAPHY', '字体与排版', '设置会保留在 JSON 中，下一次继续使用相同版式。'],
  terms: [
    'LIBRARY / LANGUAGE',
    '岗位专业词库',
    '来自 BOSS 公开岗位摘录，结合你的经历标注使用依据。',
  ],
};
function entryTools(i, n) {
  return `<div class="entry-tools"><strong>条目 ${String(i + 1).padStart(2, '0')}</strong><button class="icon-btn" data-move="${i}" data-dir="-1" aria-label="上移条目" ${i === 0 ? 'disabled' : ''}>↑</button><button class="icon-btn" data-move="${i}" data-dir="1" aria-label="下移条目" ${i === n - 1 ? 'disabled' : ''}>↓</button><button class="icon-btn" data-remove="${i}" aria-label="删除条目">×</button></div>`;
}
function renderEditor() {
  const lc = $('#library-count');
  if (lc) lc.textContent = store.library.length;
  if (store.section === 'library') {
    renderLibrary();
    renderPreview();
    return;
  }
  const [over, title, description] = sectionInfo[store.section];
  let body = '';
  if (store.section === 'basics')
    body =
      renderPhotoEditor() +
      field('姓名', 'basics.name', 'text', '填写你的姓名') +
      `<div class="form-grid">${field('联系电话', 'basics.phone', 'tel', '方便联系的手机号码')}${field('邮箱', 'basics.email', 'email', 'your@email.com')}</div>` +
      field('求职意向', 'basics.target', 'text', '例如 市场营销 / 产品运营') +
      field('期望薪资', 'basics.salary', 'text', '例如 6–8K / 面议') +
      field('作品集 / 个人主页', 'basics.links', 'text', '可选，填写链接') +
      `<div class="editor-note">中英文内容分开保存。切换语言后，可分别完善姓名拼写、职位名称和英文表达。</div>`;
  else if (['education', 'experience', 'projects', 'skills'].includes(store.section)) {
    const list = current()[store.section];
    body =
      list
        .map((x, i) => {
          const pre = store.section + '.' + i;
          let b = entryTools(i, list.length);
          if (store.section === 'education')
            b +=
              field('学校', pre + '.school') +
              `<div class="form-grid">${field('专业', pre + '.major')}${field('学历', pre + '.degree')}</div><div class="form-grid">${field('开始时间', pre + '.start', 'month')}${field('结束时间', pre + '.end', 'month')}</div><div class="form-grid">${field('GPA', pre + '.gpa', 'text', '例如 3.82/5.0')}${field('专业排名', pre + '.rank', 'text', '例如 专业前5%')}</div>` +
              field('相关课程', pre + '.courses', 'textarea');
          if (store.section === 'experience')
            b +=
              field('公司名称', pre + '.company') +
              field('职位', pre + '.role') +
              `<div class="form-grid">${field('开始时间', pre + '.start', 'month')}${field('结束时间', pre + '.end', 'month')}</div>` +
              field(
                '工作内容与成果',
                pre + '.bullets',
                'textarea',
                '每行一条经历',
                '每行生成一个项目符号。不填写没有依据的数据。',
              );
          if (store.section === 'projects')
            b +=
              field('项目名称', pre + '.title') +
              field('奖项 / 补充说明', pre + '.award', 'text', '可选') +
              `<div class="form-grid">${field('开始时间', pre + '.start', 'month')}${field('结束时间', pre + '.end', 'month')}</div>` +
              field(
                '项目内容',
                pre + '.bullets',
                'textarea',
                '每行一条项目描述',
                '模拟经营结果请保留“模拟”说明。',
              );
          if (store.section === 'skills')
            b +=
              field('技能类别', pre + '.label', 'text', '例如 AI 内容创作') +
              field('技能描述', pre + '.text', 'textarea');
          return `<div class="entry">${b}</div>`;
        })
        .join('') +
      `<button class="add-entry" id="add-entry">＋ 添加${title.includes('教育') ? '教育经历' : title.includes('实习') ? '实习经历' : store.section === 'skills' ? '技能' : '项目'}</button>`;
  } else if (store.section === 'style') body = renderStyle();
  else
    body =
      '<input class="terms-search" id="terms-search" placeholder="搜索中文或英文术语" aria-label="搜索专业术语"><div id="term-list"></div>';
  $('#editor').innerHTML =
    `<div class="editor-card"><div class="editor-heading"><span class="overline">${over}</span><h2>${title}</h2><p>${description}</p></div><div class="editor-body">${body}</div>${store.section === 'basics' ? `<div class="editor-footer"><span>编辑后自动保存</span><button class="btn" data-next="education">下一步：教育背景 →</button></div>` : ''}</div>`;
  document
    .querySelectorAll('.nav-item')
    .forEach((e) => e.classList.toggle('active', e.dataset.section === store.section));
  $('#editor')
    .querySelectorAll('[data-path]')
    .forEach((e) =>
      e.addEventListener('input', () =>
        setAt(
          e.dataset.path,
          e.dataset.path.endsWith('.bullets')
            ? e.value.split('\n').filter((x) => x.trim())
            : e.value,
        ),
      ),
    );
  $('#editor')
    .querySelectorAll('[data-remove]')
    .forEach(
      (e) =>
        (e.onclick = () => {
          snapshot('删除条目前');
          current()[store.section].splice(+e.dataset.remove, 1);
          save();
          renderEditor();
          renderPreview();
        }),
    );
  $('#editor')
    .querySelectorAll('[data-move]')
    .forEach(
      (e) =>
        (e.onclick = () => {
          let a = current()[store.section],
            i = +e.dataset.move,
            j = i + +e.dataset.dir;
          [a[i], a[j]] = [a[j], a[i]];
          save();
          renderEditor();
          renderPreview();
        }),
    );
  $('#add-entry')?.addEventListener('click', () => {
    const empty = {
      education: {
        school: '',
        major: '',
        degree: '',
        start: '',
        end: '',
        gpa: '',
        rank: '',
        courses: '',
      },
      experience: { company: '', role: '', start: '', end: '', bullets: [] },
      projects: { title: '', award: '', start: '', end: '', bullets: [] },
      skills: { label: '', text: '' },
    }[store.section];
    current()[store.section].push({ id: crypto.randomUUID(), ...empty });
    save();
    renderEditor();
    renderPreview();
  });
  $('[data-next]')?.addEventListener('click', (e) => {
    store.section = e.currentTarget.dataset.next;
    renderEditor();
  });
  if (store.section === 'basics') bindPhotoEditor();
  if (store.section === 'style') bindStyle();
  if (store.section === 'terms') {
    renderTerms('');
    $('#terms-search').oninput = (e) => renderTerms(e.target.value);
  }
}
function renderPhotoEditor() {
  const b = current().basics;
  return `<div class="photo-editor"><div class="photo-thumbnail">${b.photo ? `<img src="${esc(b.photo)}" alt="当前简历照片">` : `${icon('user')}<span>简历照片</span>`}</div><div class="photo-actions"><strong>简历照片</strong><p>JPG、PNG 或 WebP，自动裁切为 4:5。</p><button class="btn" id="upload-photo">${b.photo ? '替换照片' : '上传照片'}</button>${b.photo ? `<button class="btn quiet" id="remove-photo">移除</button><label class="photo-crop-label">裁切位置 <select id="photo-position"><option value="center" ${b.photoPosition === 'center' ? 'selected' : ''}>居中</option><option value="top" ${b.photoPosition === 'top' ? 'selected' : ''}>靠上</option><option value="bottom" ${b.photoPosition === 'bottom' ? 'selected' : ''}>靠下</option></select></label>` : ''}</div></div>`;
}
function bindPhotoEditor() {
  $('#upload-photo').onclick = () => $('#photo-file').click();
  if ($('#remove-photo'))
    $('#remove-photo').onclick = () => {
      current().basics.photo = '';
      current().basics.photoOriginal = '';
      syncPhotoToLibrary();
      save();
      renderEditor();
      renderPreview();
    };
  if ($('#photo-position'))
    $('#photo-position').onchange = async (e) => {
      current().basics.photoPosition = e.target.value;
      await cropPhoto();
      syncPhotoToLibrary();
      save();
      renderEditor();
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
function renderStyle() {
  return `<div class="form-grid"><label class="field"><span>中文字体</span><select data-font="fontCN">${['Arial Unicode MS', 'Microsoft YaHei', 'SimSun', 'PingFang SC', 'Noto Sans CJK SC'].map((x) => `<option ${store.state.style.fontCN === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label class="field"><span>英文字体</span><select data-font="fontEN">${['Arial', 'Calibri', 'Times New Roman', 'Georgia', 'Helvetica'].map((x) => `<option ${store.state.style.fontEN === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label></div>${[
    ['bodySize', '正文字号', 9, 12, 0.5, 'pt'],
    ['titleSize', '姓名字号', 18, 28, 1, 'pt'],
    ['lineHeight', '正文行距', 1.1, 1.65, 0.05, '倍'],
    ['marginMm', '页边距', 12, 24, 1, 'mm'],
  ]
    .map(
      ([key, label, min, max, step, unit]) =>
        `<div class="style-control"><label for="setting-${key}">${label}<output id="value-${key}">${store.state.style[key]} ${unit}</output></label><input type="range" id="setting-${key}" data-setting="${key}" min="${min}" max="${max}" step="${step}" value="${store.state.style[key]}"></div>`,
    )
    .join(
      '',
    )}<button class="btn" id="reset-style">恢复经典单栏设置</button><div class="font-audit"><strong>参考 PDF 字体检测</strong><p>${store.state.referenceFontAudit?.fonts?.length ? '已读取参考字体：<br>' + store.state.referenceFontAudit.fonts.map((x) => `<code>${esc(x)}</code>`).join(' ') + '<br>已识别字体名称；仍需确认本机字体可用，并对照字号和间距。' : '还没有参考 PDF，尚未验证与超级简历字体一致。导入参考文件后可读取其中的字体名称。'}</p><button class="btn" id="font-import">导入参考 PDF</button></div><p style="font-size:10px;color:#8d9c96;line-height:1.8">预览依赖本机字体。PDF 导出保留浏览器实际渲染的字形；Word 文件可继续编辑。</p>`;
}
function bindStyle() {
  document.querySelectorAll('[data-font]').forEach(
    (e) =>
      (e.onchange = () => {
        store.state.style[e.dataset.font] = e.value;
        save();
        renderPreview();
      }),
  );
  document.querySelectorAll('[data-setting]').forEach(
    (e) =>
      (e.oninput = () => {
        store.state.style[e.dataset.setting] = +e.value;
        $('#value-' + e.dataset.setting).textContent =
          e.value +
          (e.dataset.setting === 'lineHeight'
            ? ' 倍'
            : e.dataset.setting === 'marginMm'
              ? ' mm'
              : ' pt');
        save();
        renderPreview();
      }),
  );
  $('#reset-style').onclick = () => {
    store.state.style = clone(defaultState.style);
    save();
    renderEditor();
    renderPreview();
  };
  $('#font-import').onclick = () => $('#font-file').click();
}
function date(x) {
  return x ? x.replace('-', '.') : '';
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
function renderPreview() {
  const vs = viewState(),
    p = vs.profiles[vs.language],
    en = vs.language === 'en';
  const targetLine = [
    p.basics.target ? esc(p.basics.target) : '',
    p.basics.salary ? `${en ? 'Expected Salary: ' : '期望薪资：'}${esc(p.basics.salary)}` : '',
  ]
    .filter(Boolean)
    .join(' &nbsp;|&nbsp; ');
  let html = `<header class="resume-header ${p.basics.photo ? 'has-photo' : ''}">${p.basics.photo ? '<div></div>' : ''}<div class="resume-identity"><h1>${esc(p.basics.name || (en ? 'YOUR NAME' : '姓名待补充'))}</h1><p class="contacts">${[p.basics.phone || (en ? 'Phone to be added' : '手机待补充'), p.basics.email || (en ? 'Email to be added' : '邮箱待补充'), p.basics.links].filter(Boolean).map(esc).join(' &nbsp;|&nbsp; ')}</p><p class="target">${targetLine}</p></div>${p.basics.photo ? `<img class="resume-photo" src="${esc(p.basics.photo)}" alt="简历照片">` : ''}</header>`;
  if (p.education.length)
    html += `<section><h2>${en ? 'Education' : '教育背景'}</h2>${p.education.map((x) => `<div class="item"><div class="resume-row"><strong>${esc(x.school)}</strong><span class="date">${range(x.start, x.end)}</span></div><p class="qual">${[x.major, x.degree, x.gpa ? 'GPA ' + x.gpa : '', x.rank].filter(Boolean).map(esc).join(' &nbsp;|&nbsp; ')}</p>${x.courses ? `<p>${en ? 'Coursework: ' : '主修课程：'}${esc(x.courses)}</p>` : ''}</div>`).join('')}</section>`;
  if (p.experience.length)
    html += `<section><h2>${en ? 'Experience' : '工作经历'}</h2>${p.experience.map((x) => `<div class="item"><div class="resume-row"><strong>${esc(x.company)}${x.role ? ' | ' + esc(x.role) : ''}</strong><span class="date">${range(x.start, x.end)}</span></div>${lines(x.bullets)}</div>`).join('')}</section>`;
  if (p.projects.length)
    html += `<section><h2>${en ? 'Projects' : '项目经历'}</h2>${p.projects.map((x) => `<div class="item"><div class="resume-row"><strong>${esc(x.title)}${x.award && !en ? ' | ' + esc(x.award) : ''}</strong><span class="date">${range(x.start, x.end)}</span></div>${x.award && en ? `<p class="award">${esc(x.award)}</p>` : ''}${lines(x.bullets)}</div>`).join('')}</section>`;
  if (p.skills.length)
    html += `<section><h2>${en ? 'Skills' : '专业技能'}</h2>${p.skills.map((x) => `<p class="skill"><strong>${esc(x.label)}${en ? ': ' : '：'}</strong>${esc(x.text)}</p>`).join('')}</section>`;
  const preview = $('#resume-preview');
  preview.innerHTML = html;
  const safeFamily = (x) => String(x).replace(/["'<>;\\]/g, '');
  preview.style.fontFamily = `"${safeFamily(vs.style.fontEN)}","${safeFamily(vs.style.fontCN)}",sans-serif`;
  preview.style.fontSize = vs.style.bodySize + 'pt';
  preview.style.lineHeight = vs.style.lineHeight;
  preview.style.padding = vs.style.marginMm + 'mm';
  preview.style.color = vs.style.accent || '#111111';
  preview.querySelector('h1').style.fontSize = vs.style.titleSize + 'pt';
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
  const paper = preview.cloneNode(true);
  paper.removeAttribute('id');
  paper.style.transform = 'none';
  $('#print-root').replaceChildren(paper);
}
function renderTerms(q) {
  const rows = terminology.filter((t) =>
    [t.cn, t.en, t.category].join(' ').toLowerCase().includes(q.toLowerCase()),
  );
  $('#term-list').innerHTML =
    rows
      .map(
        (t) =>
          `<div class="term"><div class="term-head"><strong>${esc(t.cn)}</strong><span class="badge ${t.evidence === 'supported' ? '' : 'pending'}">${t.evidence === 'supported' ? '有经历依据' : '待补充依据'}</span></div><div class="term-en">${esc(t.en)}</div><p>${esc(t.definition)}</p><p>${esc(t.resumeEvidence)}</p><div class="term-actions"><a href="${esc(t.sourceUrl)}" target="_blank" rel="noopener noreferrer">BOSS 公开摘录 ↗</a><button data-copy="${esc(store.state.language === 'en' ? t.en : t.cn)}">复制词汇</button></div></div>`,
      )
      .join('') || '<p>没有匹配的词汇。</p>';
  $('#term-list')
    .querySelectorAll('[data-copy]')
    .forEach(
      (e) =>
        (e.onclick = async () => {
          try {
            await navigator.clipboard.writeText(e.dataset.copy);
            notify('已复制，请结合真实经历使用。');
          } catch {
            notify('当前浏览器不允许复制，请手动选取词汇。');
          }
        }),
    );
}
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
$('#font-file').onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    if (f.size > 15 * 1024 * 1024) throw new Error('参考 PDF 请小于 15 MB');
    const lib = window.PDFLib;
    const pdf = await lib.PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: false });
    const found = new Set();
    for (const [, o] of pdf.context.enumerateIndirectObjects()) {
      if (o instanceof lib.PDFDict) {
        const b = o.get(lib.PDFName.of('BaseFont'));
        if (b) {
          const raw = b.decodeText ? b.decodeText() : b.toString();
          found.add(raw.replace(/^\//, '').replace(/^[A-Z]{6}\+/, ''));
        }
      }
    }
    if (!found.size) throw new Error('未发现可读取的字体，文件可能已转为图片');
    store.state.referenceFontAudit = {
      fonts: [...found],
      fileName: f.name,
      checkedAt: new Date().toISOString(),
      verified: false,
    };
    save();
    renderEditor();
    notify('参考字体已识别。请按名称选择字体并对照预览。');
  } catch (err) {
    notify('字体检测：' + err.message);
  }
  e.target.value = '';
};
$('#modal').addEventListener('click', (e) => {
  if (e.target === $('#modal')) $('#modal').close();
});
window.addEventListener('beforeprint', () => {
  const paper = $('#resume-preview').cloneNode(true);
  paper.removeAttribute('id');
  paper.style.transform = 'none';
  $('#print-root').replaceChildren(paper);
});
window.addEventListener('resize', () => renderPreview());
renderEditor();
renderPreview();
setTimeout(() => {
  if (store.librarySeeded) notify('已载入 5 个虚构岗位演示。人物、机构、经历与数据均为示例。');
}, 900);

window.addEventListener('resume-io-warning', (e) =>
  notify(e.detail?.message || '导出时有内容需检查。'),
);
$('#photo-file').onchange = async (e) => {
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
    renderEditor();
    renderPreview();
    notify('照片已同步到所有简历。');
  } catch (err) {
    notify(err.message);
  } finally {
    if (url) URL.revokeObjectURL(url);
    e.target.value = '';
  }
};
