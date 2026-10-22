/* Local-only resume interchange.
 * JSON schema v1: {version:1, language:'zh'|'en', meta:{title}, style:{...},
 * profiles:{zh:{basics,education,experience,projects,skills}, en:{...}}}.
 * Every imported object is reconstructed from allowlisted keys. JSON is the
 * lossless, bilingual editable format. DOCX contains the current language;
 * DOCX import provides a best-effort draft and the complete extracted text.
 */
import { clean, normalizeState, photoInfo, normalizeProfile } from './lib/schema.js';
import { exportFilename } from './lib/resume-utils.js';
import { downloadBlob } from './lib/download.js';
export { normalizeState };

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_XML_BYTES = 16 * 1024 * 1024;
const MAX_TEXT = 200000;
function ioWarning(message) {
  if (typeof window?.dispatchEvent === 'function' && typeof CustomEvent === 'function')
    window.dispatchEvent(new CustomEvent('resume-io-warning', { detail: { message } }));
}
async function preparePhoto(value) {
  const info = photoInfo(value);
  let image;
  let imageUrl;
  try {
    if (typeof createImageBitmap === 'function')
      image = await createImageBitmap(new Blob([info.bytes], { type: info.mime }));
    else if (typeof window.Image === 'function') {
      imageUrl = URL.createObjectURL(new Blob([info.bytes], { type: info.mime }));
      image = await new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('照片无法解码，请重新上传。'));
        img.src = imageUrl;
      });
    }
    if (info.type !== 'webp') return info;
    if (!image) throw new Error('当前环境无法转换 WebP 照片，请改用 JPEG 或 PNG。');
    const canvas = document.createElement('canvas');
    canvas.width = info.width;
    canvas.height = info.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('当前浏览器无法转换 WebP 照片，请改用 JPEG 或 PNG。');
    context.drawImage(image, 0, 0, info.width, info.height);
    return photoInfo(canvas.toDataURL('image/png'));
  } finally {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    if (image && typeof image.close === 'function') image.close();
  }
}
export function exportJson(input) {
  const warnings = [];
  const state = normalizeState(input, warnings);
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  downloadBlob(blob, exportFilename(state, 'json'));
  warnings.forEach(ioWarning);
  return blob;
}

export async function exportDocx(input) {
  if (!window.docx) throw new Error('Word 导出组件未载入，请刷新页面后再试。');
  const warnings = [];
  const state = normalizeState(input, warnings);
  const d = window.docx;
  const p = state.profiles[state.language];
  const cn = state.language === 'zh';
  const s = state.style;
  const margin = Math.round((s.marginMm * 1440) / 25.4);
  const width = Math.round((210 * 1440) / 25.4) - margin * 2;
  const font = { ascii: s.fontEN, hAnsi: s.fontEN, cs: s.fontEN, eastAsia: s.fontCN };
  const line = Math.round(s.lineHeight * 240);
  const body = Math.round(s.bodySize * 2);
  const color = '202734';
  const accentColor = s.accent.replace('#', '');
  const run = (text, extra = {}) =>
    new d.TextRun({ text: clean(text, 10000), font, size: body, color, ...extra });
  const spacing = { before: 0, after: 35, line, lineRule: d.LineRuleType?.AUTO || 'auto' };
  const paragraph = (children, extra = {}) => new d.Paragraph({ children, spacing, ...extra });
  const out = [],
    header = [];
  const labels = cn
    ? ['教育背景', '工作经历', '项目经历', '专业技能']
    : ['Education', 'Experience', 'Projects', 'Skills'];
  header.push(
    paragraph(
      [
        run(p.basics.name || (cn ? '姓名待补充' : 'YOUR NAME'), {
          bold: true,
          color: accentColor,
          size: Math.round(s.titleSize * 2),
        }),
      ],
      {
        alignment: d.AlignmentType.CENTER,
        spacing: { before: 0, after: 55, line: 280 },
        keepNext: true,
      },
    ),
  );
  const contact = [
    p.basics.phone || (cn ? '手机待补充' : 'Phone to be added'),
    p.basics.email || (cn ? '邮箱待补充' : 'Email to be added'),
    p.basics.links,
  ]
    .filter(Boolean)
    .join('  |  ');
  header.push(paragraph([run(contact)], { alignment: d.AlignmentType.CENTER, keepNext: true }));
  const targetText = [
    p.basics.target,
    p.basics.salary ? `${cn ? '期望薪资：' : 'Expected Salary: '}${p.basics.salary}` : '',
  ]
    .filter(Boolean)
    .join('  |  ');
  header.push(
    paragraph([run(targetText)], {
      alignment: d.AlignmentType.CENTER,
      spacing: { before: 10, after: 65, line },
      keepNext: true,
    }),
  );
  let photo;
  if (p.basics.photo && s.showPhoto !== false) {
    try {
      photo = await preparePhoto(p.basics.photo);
    } catch (error) {
      warnings.push(`照片未加入 Word：${error.message || '图片无法解码，请重新上传。'}`);
    }
  }
  if (photo) {
    const noBorder = { style: d.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const borders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
    const imageWidth = Math.round((24 * 1440) / 25.4),
      middleWidth = width - imageWidth * 2;
    const cell = (children, size) =>
      new d.TableCell({
        children,
        width: { size, type: d.WidthType.DXA },
        borders,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        verticalAlign: d.VerticalAlign.TOP,
      });
    const imageRun = new d.ImageRun({
      type: photo.type === 'jpeg' ? 'jpg' : 'png',
      data: photo.bytes,
      transformation: { width: (24 * 96) / 25.4, height: (30 * 96) / 25.4 },
      altText: {
        title: cn ? '简历照片' : 'Resume photo',
        description: cn ? '用户上传的照片' : 'User-provided photo',
        name: 'resume-photo',
      },
    });
    out.push(
      new d.Table({
        width: { size: width, type: d.WidthType.DXA },
        layout: d.TableLayoutType.FIXED,
        columnWidths: [imageWidth, middleWidth, imageWidth],
        borders: { ...borders, insideHorizontal: noBorder, insideVertical: noBorder },
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        rows: [
          new d.TableRow({
            cantSplit: true,
            children: [
              cell([paragraph([])], imageWidth),
              cell(header, middleWidth),
              cell(
                [
                  paragraph([imageRun], {
                    alignment: d.AlignmentType.RIGHT,
                    spacing: { before: 0, after: 0 },
                  }),
                ],
                imageWidth,
              ),
            ],
          }),
        ],
      }),
    );
  } else out.push(...header);
  warnings.forEach(ioWarning);
  function section(title) {
    out.push(
      paragraph([run(title, { bold: true, color: accentColor, size: body + 1 })], {
        border: { bottom: { color: accentColor, size: 4, space: 3, style: d.BorderStyle.SINGLE } },
        spacing: { before: 110, after: 60, line },
        keepNext: true,
      }),
    );
  }
  function dateRange(item) {
    return [item.start, item.end]
      .filter(Boolean)
      .map((value) => value.replace('-', '.'))
      .join(' - ');
  }
  function heading(title, detail, date) {
    const children = [run(title, { bold: true })];
    if (detail) children.push(run(` | ${detail}`, { bold: true }));
    if (date)
      children.push(new d.TextRun({ children: [new d.Tab(), date], font, size: body, color }));
    out.push(
      paragraph(children, {
        tabStops: [{ type: d.TabStopType.RIGHT, position: width }],
        keepNext: true,
        spacing: { before: 45, after: 25, line },
      }),
    );
  }
  function bullet(text) {
    if (!text) return;
    out.push(
      paragraph([run(text)], {
        numbering: { reference: 'resume-bullets', level: 0 },
        widowControl: true,
      }),
    );
  }
  if (p.education.length) {
    section(labels[0]);
    for (const item of p.education) {
      heading(item.school, '', dateRange(item));
      const qualification = [item.major, item.degree, item.gpa ? `GPA ${item.gpa}` : '', item.rank]
        .filter(Boolean)
        .join('  |  ');
      if (qualification) out.push(paragraph([run(qualification)]));
      if (item.courses)
        out.push(paragraph([run(`${cn ? '主修课程：' : 'Coursework: '}${item.courses}`)]));
    }
  }
  if (p.experience.length) {
    section(labels[1]);
    for (const item of p.experience) {
      heading(item.company, item.role, dateRange(item));
      item.bullets.forEach(bullet);
    }
  }
  if (p.projects.length) {
    section(labels[2]);
    for (const item of p.projects) {
      heading(item.title, cn ? item.award : '', dateRange(item));
      if (!cn && item.award) out.push(paragraph([run(item.award)]));
      item.bullets.forEach(bullet);
    }
  }
  if (p.skills.length) {
    section(labels[3]);
    for (const item of p.skills) {
      out.push(
        paragraph([
          run(item.label ? `${item.label}${cn ? '：' : ': '}` : '', { bold: true }),
          run(item.text),
        ]),
      );
    }
  }
  const doc = new d.Document({
    creator: 'Resume Studio',
    title: state.meta.title,
    description: cn ? '中文简历' : 'English Resume',
    styles: { default: { document: { run: { font, size: body, color }, paragraph: { spacing } } } },
    numbering: {
      config: [
        {
          reference: 'resume-bullets',
          levels: [
            {
              level: 0,
              format: d.LevelFormat.BULLET,
              text: '•',
              alignment: d.AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 170, hanging: 130 } },
                run: { font: s.fontEN, size: body },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: margin, right: margin, bottom: margin, left: margin },
          },
        },
        children: out,
      },
    ],
  });
  const blob = await d.Packer.toBlob(doc);
  downloadBlob(blob, exportFilename(state, 'docx').replace(/\.docx$/, '_可编辑版.docx'));
  return blob;
}

function parseXml(source) {
  if (source.length > MAX_XML_BYTES) throw new Error('Word 正文解压后过大，请拆分文档。');
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('不支持含外部实体定义的 XML。');
  const parsed = new DOMParser().parseFromString(source, 'application/xml');
  if (parsed.getElementsByTagName('parsererror').length) throw new Error('Word XML 格式损坏。');
  return parsed;
}
function localElements(element, name) {
  return Array.from(element.getElementsByTagNameNS('*', name));
}
function nodeParagraphText(node) {
  let result = '';
  function visit(current) {
    if (current.nodeType !== 1) return;
    if (current.localName === 't') result += current.textContent || '';
    else if (current.localName === 'tab') result += '\t';
    else if (current.localName === 'br' || current.localName === 'cr') result += '\n';
    else if (current.localName !== 'del') for (const child of current.childNodes) visit(child);
  }
  visit(node);
  return clean(result, 15000);
}
function emptyProfile() {
  return {
    basics: { name: '', phone: '', email: '', target: '', salary: '', links: '' },
    education: [],
    experience: [],
    projects: [],
    skills: [],
  };
}
function headingSection(value) {
  const text = value.replace(/[\s:：•·\-—_]/g, '').toLowerCase();
  if (/^(教育背景|教育经历|教育|education|educationalbackground|academicbackground)$/.test(text))
    return 'education';
  if (
    /^(实习经历|工作经历|工作经验|实习经验|实践经历|experience|workexperience|professionalexperience|internshipexperience|employment)$/.test(
      text,
    )
  )
    return 'experience';
  if (
    /^(项目经历|项目经验|项目与竞赛|项目与国际交流|竞赛经历|projects|projectexperience|selectedprojects|projectsandawards|projectsandinternationalexperience)$/.test(
      text,
    )
  )
    return 'projects';
  if (
    /^(专业技能|技能|技能证书|个人技能|skills|professionalskills|skillsandcertifications|technicalskills|additionalskills)$/.test(
      text,
    )
  )
    return 'skills';
  return '';
}
function extractDates(line) {
  const datePattern =
    /((?:19|20)\d{2}(?:[.\/-](?:0?[1-9]|1[0-2]))?|(?:19|20)\d{2}年(?:\d{1,2}月)?|present|current|至今|在读)/gi;
  const matches = [...line.matchAll(datePattern)];
  const dates = matches.slice(-2).map((m) => m[0]);
  let title = line;
  if (matches.length >= 2)
    title = line.slice(0, matches[matches.length - 2].index).replace(/[\t |｜–—~至-]+$/, '');
  else if (line.includes('\t') && matches.length === 1)
    title = line.slice(0, line.lastIndexOf('\t'));
  return { title: title.trim(), start: dates[0] || '', end: dates[1] || '' };
}
function splitHeading(title) {
  const parts = title
    .split(/\s+[|｜]\s+|\t+/)
    .map((t) => t.trim())
    .filter(Boolean);
  return { name: parts[0] || '', detail: parts.slice(1).join(' | ') };
}
function draftFromParagraphs(paragraphs, currentState, warnings) {
  const nonempty = paragraphs.filter((p) => p.text.trim());
  const counts = nonempty.reduce((acc, p) => {
    const key = headingSection(p.text);
    if (key) acc.add(key);
    return acc;
  }, new Set());
  if (!counts.size) return undefined;
  const englishHeadings = nonempty
    .filter((p) => headingSection(p.text))
    .filter((p) => /[a-zA-Z]{3}/.test(p.text)).length;
  const lang = englishHeadings >= Math.ceil(counts.size / 2) ? 'en' : 'zh';
  const state = normalizeState(currentState, warnings);
  const profile = emptyProfile();
  const preamble = [];
  let section = '';
  let current = null;
  let serial = 0;
  function newEntry(key, text) {
    const dates = extractDates(text);
    const split = splitHeading(dates.title);
    const id = `${lang}-import-${++serial}`;
    if (key === 'education')
      return {
        id,
        school: split.name,
        degree: '',
        major: split.detail,
        start: dates.start,
        end: dates.end,
        gpa: '',
        rank: '',
        courses: '',
      };
    if (key === 'experience')
      return {
        id,
        company: split.name,
        role: split.detail,
        start: dates.start,
        end: dates.end,
        bullets: [],
      };
    return {
      id,
      title: split.name,
      award: split.detail,
      start: dates.start,
      end: dates.end,
      bullets: [],
    };
  }
  for (const para of nonempty) {
    const text = para.text;
    const key = headingSection(text);
    if (key) {
      section = key;
      current = null;
      continue;
    }
    if (!section) {
      preamble.push(text);
      continue;
    }
    if (section === 'skills') {
      const parts = text.match(/^([^:：]{1,100})[:：]\s*(.*)$/s);
      profile.skills.push({
        id: `${lang}-import-${++serial}`,
        label: parts ? parts[1] : '',
        text: parts ? parts[2] : text,
      });
      continue;
    }
    const bullet = para.bullet || /^[•●▪◦]\s*/.test(text);
    const looksHeading = !bullet && (para.bold || text.includes('\t'));
    if (!current || looksHeading) {
      current = newEntry(section, text);
      profile[section].push(current);
      continue;
    }
    if (section === 'education') {
      const qualification = text.split(/\s*[|｜]\s*/);
      if (
        !current.major &&
        qualification.length >= 2 &&
        !/^(?:相关课程|主修课程|coursework|courses)\s*[:：]/i.test(text)
      ) {
        current.major = qualification[0];
        current.degree = qualification[1];
        const grade = qualification.find((value) => /GPA\s*[:：]?\s*[\d.]+/i.test(value));
        if (grade) current.gpa = grade.replace(/^GPA\s*[:：]?\s*/i, '');
        current.rank = qualification
          .slice(2)
          .filter((value) => value !== grade)
          .join(' | ');
        continue;
      }
      const gpa = text.match(/GPA\s*[:：]?\s*([\d.]+\s*\/\s*[\d.]+|[\d.]+)/i);
      if (gpa) current.gpa = gpa[1];
      const course = text.match(/^(?:相关课程|主修课程|coursework|courses)\s*[:：]\s*(.*)$/i);
      if (course) current.courses = [current.courses, course[1]].filter(Boolean).join('\n');
      else if (!gpa) current.courses = [current.courses, text].filter(Boolean).join('\n');
      else {
        const rest = text.replace(gpa[0], '').replace(/^[ |｜]+|[ |｜]+$/g, '');
        if (rest) current.rank = rest;
      }
    } else if (
      section === 'projects' &&
      !bullet &&
      !current.award &&
      !current.bullets.length &&
      /\b(?:prize|award|scholarship|winner|runner.up)\b/i.test(text)
    ) {
      current.award = text;
    } else current.bullets.push(text.replace(/^[•●▪◦]\s*/, ''));
  }
  if (preamble.length)
    profile.basics.name = /^(?:姓名待补充|YOUR NAME)$/.test(preamble[0]) ? '' : preamble[0];
  for (const [index, original] of preamble.slice(1).entries()) {
    const line = original
      .replace(/手机待补充|邮箱待补充|Phone to be added|Email to be added/g, '')
      .trim();
    const target = line.match(/^(?:求职意向|意向岗位|target|objective)\s*[:：]\s*(.*)$/i);
    if (target) {
      profile.basics.target = target[1];
      continue;
    }
    const salary = line.match(
      /^(?:期望薪资|薪资期望|expected salary|salary expectation)\s*[:：]\s*(.*)$/i,
    );
    if (salary) {
      profile.basics.salary = salary[1];
      continue;
    }
    const email = line.match(/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phone = line.match(/(?:\+\d{1,3}[ -]?)?(?:\d[ ()-]?){7,15}\d/);
    if (!email && !phone && index >= 1 && !profile.basics.target) {
      profile.basics.target = line;
      continue;
    }
    if (email) profile.basics.email = email[0];
    if (phone) profile.basics.phone = phone[0].trim();
    const residual = line
      .replace(email?.[0] || '\u0001', '')
      .replace(phone?.[0] || '\u0001', '')
      .replace(/^[ |｜]+|[ |｜]+$/g, '');
    if (residual)
      profile.basics.links = [profile.basics.links, residual].filter(Boolean).join(' | ');
  }
  state.profiles[lang] = normalizeProfile(profile, lang, warnings);
  state.language = lang;
  warnings.push(
    'Word 已按分区识别为草稿；请逐项核对职位、日期、课程、项目及联系方式。全部提取原文也已保留供检查。',
  );
  warnings.push(
    'Word 导入仅替换识别语言的内容；另一语言保留原数据，不会自动翻译。原文件的字体、图像与排版未导入。',
  );
  return state;
}

// Reconstruct PDF text items in reading order: spaces between Latin words,
// none between CJK characters, line breaks where the PDF marks them.
const CJK_CHAR = /[\u2e80-\u9fff\uf900-\ufaff\u3000-\u303f\uff00-\uffef]/;
function joinPdfItems(items) {
  let out = '';
  for (const item of items) {
    const text = typeof item?.str === 'string' ? item.str : '';
    if (!text) continue;
    if (out && !out.endsWith('\n') && !(CJK_CHAR.test(out.at(-1)) && CJK_CHAR.test(text[0])))
      out += ' ';
    out += text;
    if (item.hasEOL) out += '\n';
  }
  return out.trim();
}

export async function importFile(file, currentState) {
  const warnings = [];
  try {
    if (!file || typeof file.size !== 'number') throw new Error('请选择一个本地文件。');
    if (file.size > MAX_BYTES) throw new Error('文件不能超过 10 MB。');
    const extension = (file.name || '').split('.').pop().toLowerCase();
    if (extension === 'json') {
      const input = JSON.parse(await file.text());
      const state = normalizeState(input, warnings);
      return { state, warnings };
    }
    if (extension === 'docx') {
      if (!window.JSZip) throw new Error('Word 导入组件未载入，请刷新页面后重试。');
      const buffer = await file.arrayBuffer();
      const zip = await window.JSZip.loadAsync(buffer, { checkCRC32: false });
      const files = Object.values(zip.files);
      if (files.length > 2500) throw new Error('Word 文件包含过多条目，请使用简化后的 .docx。');
      const documentFile = zip.file('word/document.xml');
      if (!documentFile) throw new Error('该文件不是有效的 Word .docx 文档。');
      const declared = documentFile._data?.uncompressedSize;
      if (typeof declared === 'number' && declared > MAX_XML_BYTES)
        throw new Error('Word 正文解压后过大，请拆分文档。');
      const xml = parseXml(await documentFile.async('string'));
      const paragraphs = localElements(xml, 'p').map((node) => ({
        text: nodeParagraphText(node),
        bullet: localElements(node, 'numPr').length > 0,
        bold: localElements(node, 'r').some(
          (r) =>
            localElements(r, 'b').length > 0 &&
            localElements(r, 't').some((t) => (t.textContent || '').trim()),
        ),
      }));
      const rawText = paragraphs
        .map((p) => p.text)
        .join('\n')
        .trim();
      if (rawText.length > MAX_TEXT) throw new Error('Word 提取正文超过 20 万字，请拆分文档。');
      if (!rawText) throw new Error('未读取到可编辑正文，图片扫描件请先转成文字。');
      const state = draftFromParagraphs(paragraphs, currentState, warnings);
      if (!state)
        warnings.push(
          '未能可靠识别简历分区，已保留全部正文。请从下方原文复制到对应字段，当前简历未被替换。',
        );
      if (localElements(xml, 'drawing').length || localElements(xml, 'pict').length)
        warnings.push('文件包含图像或文本框，请对照原 Word 检查文字是否完整。');
      return { state, rawText, warnings };
    }
    if (['txt', 'md', 'markdown'].includes(extension)) {
      const rawText = clean(await file.text(), MAX_TEXT);
      warnings.push('已读取文字。请核对后复制到对应字段；当前简历保持不变。');
      if (file.size > MAX_TEXT) warnings.push('文本预览最多保留 20 万字。');
      return { rawText, warnings };
    }
    if (extension === 'pdf') {
      const pdfjs = window.pdfjsLib;
      if (!pdfjs) throw new Error('PDF 导入组件未载入，请刷新页面后重试。');
      pdfjs.GlobalWorkerOptions.workerSrc = './vendor/pdf.worker.min.js';
      const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const pages = [];
      for (let pageIndex = 1; pageIndex <= Math.min(doc.numPages, 60); pageIndex++) {
        const content = await doc.getPage(pageIndex).then((page) => page.getTextContent());
        const text = joinPdfItems(content.items);
        if (text) pages.push(text);
      }
      await doc.destroy?.();
      const rawText = clean(pages.join('\n\n'), MAX_TEXT);
      if (!rawText) throw new Error('未读取到可编辑正文，图片扫描件请先转成文字。');
      warnings.push('已读取文字。请核对后复制到对应字段；当前简历保持不变。');
      if (pages.join('\n\n').length > MAX_TEXT) warnings.push('文本预览最多保留 20 万字。');
      return { rawText, warnings };
    }
    throw new Error('不支持此格式。请选择 JSON、Word (.docx)、TXT 或 Markdown 文件。');
  } catch (error) {
    return {
      warnings: [
        ...warnings,
        `导入未完成：${error instanceof Error ? error.message : '无法读取此文件。'}`,
      ],
    };
  }
}

export async function exportDocxImage(input, pages) {
  if (!window.docx) throw new Error('Word 导出组件未载入，请刷新页面后再试。');
  const state = normalizeState(input);
  const d = window.docx;
  const children = pages.map(
    (p, i) =>
      new d.Paragraph({
        children: [
          new d.ImageRun({
            type: 'png',
            data: p.bytes,
            transformation: { width: 793, height: 1122 },
          }),
        ],
        spacing: { before: 0, after: 0, line: 1 },
        pageBreakBefore: i > 0,
      }),
  );
  const doc = new d.Document({
    creator: 'Resume Studio',
    title: state.meta.title,
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
          },
        },
        children,
      },
    ],
  });
  const blob = await d.Packer.toBlob(doc);
  downloadBlob(blob, exportFilename(state, 'docx').replace(/\.docx$/, '_图片版.docx'));
  return blob;
}

export async function exportPdfImage(input, pages) {
  const state = normalizeState(input);
  if (!window.PDFLib) throw new Error('PDF 导出组件未载入，请刷新页面后再试。');
  const lib = window.PDFLib;
  const pdf = await lib.PDFDocument.create();
  for (const p of pages) {
    const img = await pdf.embedPng(p.bytes);
    const page = pdf.addPage([595.28, 841.89]);
    page.drawImage(img, { x: 0, y: 0, width: 595.28, height: 841.89 });
  }
  const bytes = await pdf.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  downloadBlob(blob, exportFilename(state, 'pdf'));
  return blob;
}

export function exportPrint() {
  window.print();
}
