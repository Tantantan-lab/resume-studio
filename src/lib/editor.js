import { defaultState } from '../demo/data.js';
import { $, esc, clone } from './util.js';
import { store, current, save, snapshot } from './store.js';
import { autoResumeName } from './resume-utils.js';
import { EMPTY_ENTRIES } from './schema.js';
import { renderPreview } from './preview.js';
import { renderPhotoEditor, bindPhotoEditor } from './photo.js';
import { renderTerms } from './terms-view.js';
import { renderers } from './renderers.js';
import {
  PAPER_TEMPLATES,
  PAPER_COLORS,
  getPaperTemplate,
  applyPaperTemplate,
  paperAccent,
} from './paper-design.js';

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
  style: [
    'PAPER / DESIGN',
    '纸面设计',
    '为简历选择版式，再调整主题色、照片、字体与留白。设置随当前简历保存。',
  ],
  terms: ['LIBRARY / LANGUAGE', '岗位专业词库', '来自公开岗位资料整理，结合你的经历标注使用依据。'],
};
const nextSection = {
  basics: ['education', '下一步：教育背景 →'],
  education: ['experience', '下一步：工作经历 →'],
  experience: ['projects', '下一步：项目经历 →'],
  projects: ['skills', '下一步：专业技能 →'],
  skills: ['style', '下一步：纸面设计 →'],
};
function entryTools(i, n) {
  return `<div class="entry-tools"><strong>条目 ${String(i + 1).padStart(2, '0')}</strong><button class="icon-btn" data-move="${i}" data-dir="-1" aria-label="上移条目" ${i === 0 ? 'disabled' : ''}>↑</button><button class="icon-btn" data-move="${i}" data-dir="1" aria-label="下移条目" ${i === n - 1 ? 'disabled' : ''}>↓</button><button class="icon-btn" data-remove="${i}" aria-label="删除条目">×</button></div>`;
}
export function renderEditor() {
  const lc = $('#library-count');
  if (lc) lc.textContent = store.library.length;
  if (store.section === 'library') {
    renderers.renderLibrary();
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
      `<button class="add-entry" id="add-entry">＋ 添加${store.section === 'education' ? '教育经历' : store.section === 'experience' ? '工作经历' : store.section === 'skills' ? '技能' : '项目'}</button>`;
  } else if (store.section === 'style') body = renderStyle();
  else
    body =
      '<input class="terms-search" id="terms-search" placeholder="搜索中文或英文术语" aria-label="搜索专业术语"><div id="term-list"></div>';
  const next = nextSection[store.section];
  $('#editor').innerHTML =
    `<div class="editor-card"><div class="editor-heading"><span class="overline">${over}</span><h2>${title}</h2><p>${description}</p></div><div class="editor-body">${body}</div>${next ? `<div class="editor-footer"><span>编辑后自动保存</span><button class="btn" data-next="${next[0]}">${next[1]}</button></div>` : ''}</div>`;
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
    const empty = clone(EMPTY_ENTRIES[store.section]);
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
  if (store.section === 'style') {
    bindStyle();
    renderPreview();
  }
  if (store.section === 'terms') {
    renderTerms('');
    $('#terms-search').oninput = (e) => renderTerms(e.target.value);
  }
}
function renderStyle() {
  const selected = getPaperTemplate(store.state.style.template).id;
  const accent = paperAccent(store.state.style.accent);
  const designs = `<section class="paper-design-section" aria-labelledby="paper-template-heading"><div class="paper-section-head"><h3 id="paper-template-heading">选择纸面模板</h3><span>4 种版式 · 中英通用</span></div><div class="paper-template-grid">${PAPER_TEMPLATES.map((template) => `<button type="button" class="paper-template-card ${selected === template.id ? 'is-selected' : ''}" data-paper-template="${template.id}" aria-pressed="${selected === template.id}" aria-label="${template.name}" style="--card-accent:${template.preset.accent}"><span class="paper-mini paper-mini-${template.id}" aria-hidden="true"><i class="mini-name"></i><i class="mini-contact"></i><span class="mini-body"><span class="mini-side"><i></i><i></i><i></i></span><span class="mini-main"><i></i><i></i><i></i><i></i></span></span></span><span class="paper-template-copy"><small>${template.english}</small><strong>${template.name}</strong><span>${template.description}</span></span><span class="paper-template-check" aria-hidden="true">${selected === template.id ? '✓' : ''}</span></button>`).join('')}</div><p class="paper-help">选择模板会应用配套字体与留白；正文和照片文件保留，可继续微调。侧栏版适合视觉展示，岗位要求单栏时可选“海外简洁”。</p></section>`;
  const colors = `<section class="paper-design-section"><div class="paper-section-head"><h3>主题与照片</h3><span>正文保持深色，重点更清楚</span></div><div class="paper-color-row"><div class="paper-swatches" role="group" aria-label="主题色">${PAPER_COLORS.map(({ color, name }) => `<button type="button" class="paper-swatch" data-paper-color="${color}" style="--swatch:${color}" aria-label="${name}" aria-pressed="${accent.toLowerCase() === color}" title="${name}">${accent.toLowerCase() === color ? '✓' : ''}</button>`).join('')}</div><label class="paper-custom-color">自选<input id="paper-accent" type="color" value="${accent}" aria-label="自定义主题色"></label></div><label class="paper-photo-toggle"><span><strong>在简历中显示照片</strong><small>按目标岗位要求选择，隐藏时保留原图。</small></span><input id="paper-show-photo" type="checkbox" ${store.state.style.showPhoto !== false ? 'checked' : ''}></label><label class="paper-photo-toggle paper-fill-toggle"><span><strong>自动铺满一页</strong><small>自动调整间距，保持字号不变；超过一页时保留原有分页。</small></span><input id="paper-fill-page" type="checkbox" ${store.state.style.fillPage === true ? 'checked' : ''}></label><output id="paper-fill-status" class="paper-fill-status" aria-live="polite"></output></section>`;
  return (
    designs +
    colors +
    `<div class="paper-section-head"><h3>字体与留白</h3><span>应用到当前简历的中英文版</span></div><div class="form-grid"><label class="field"><span>中文字体</span><select data-font="fontCN">${['Arial Unicode MS', 'Microsoft YaHei', 'SimSun', 'PingFang SC', 'Noto Sans CJK SC'].map((x) => `<option ${store.state.style.fontCN === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label class="field"><span>英文字体</span><select data-font="fontEN">${['Arial', 'Calibri', 'Times New Roman', 'Georgia', 'Helvetica'].map((x) => `<option ${store.state.style.fontEN === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label></div>${[
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
      )}<button class="btn" id="reset-style">恢复经典单栏设置</button><p style="font-size:10px;color:#8d9c96;line-height:1.8">预览依赖本机字体。PDF 导出保留浏览器实际渲染的字形；Word 文件可继续编辑。</p>`
  );
}
function bindStyle() {
  document.querySelectorAll('[data-paper-template]').forEach((button) => {
    button.onclick = () => {
      store.state.style = applyPaperTemplate(store.state.style, button.dataset.paperTemplate);
      save();
      renderEditor();
      renderPreview();
    };
  });
  const setAccent = (color) => {
    store.state.style.accent = paperAccent(color);
    save();
    renderPreview();
  };
  document.querySelectorAll('[data-paper-color]').forEach((button) => {
    button.onclick = () => {
      setAccent(button.dataset.paperColor);
      renderEditor();
    };
  });
  $('#paper-accent').oninput = (event) => {
    setAccent(event.target.value);
    document.querySelectorAll('[data-paper-color]').forEach((button) => {
      const selected = button.dataset.paperColor === event.target.value.toLowerCase();
      button.setAttribute('aria-pressed', String(selected));
      button.textContent = selected ? '✓' : '';
    });
  };
  $('#paper-fill-page').onchange = (event) => {
    store.state.style.fillPage = event.target.checked;
    save();
    renderPreview();
  };
  $('#paper-show-photo').onchange = (event) => {
    store.state.style.showPhoto = event.target.checked;
    save();
    renderPreview();
  };
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
}
