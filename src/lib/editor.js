import { defaultState } from '../demo/data.js';
import { $, esc, clone } from './util.js';
import { store, current, save, snapshot } from './store.js';
import { autoResumeName } from './resume-utils.js';
import { EMPTY_ENTRIES } from './schema.js';
import { renderPreview } from './preview.js';
import { renderPhotoEditor, bindPhotoEditor } from './photo.js';
import { renderTerms } from './terms-view.js';
import { renderers } from './renderers.js';
import { notify } from './ui.js';

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
  terms: ['LIBRARY / LANGUAGE', '岗位专业词库', '来自公开岗位资料整理，结合你的经历标注使用依据。'],
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
  if (store.section === 'style') bindStyle();
  if (store.section === 'terms') {
    renderTerms('');
    $('#terms-search').oninput = (e) => renderTerms(e.target.value);
  }
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
export function initFontImport() {
  const input = $('#font-file');
  if (!input) return;
  input.onchange = async (e) => {
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
}
