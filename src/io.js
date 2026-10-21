/* Local-only resume interchange.
 * JSON schema v1: {version:1, language:'zh'|'en', meta:{title}, style:{...},
 * profiles:{zh:{basics,education,experience,projects,skills}, en:{...}}}.
 * Optional referenceFontAudit: {fonts:string[<=30], fileName:string,
 * checkedAt:string, verified:false}; this records detected names, never a
 * claim that a local font or layout matches a reference.
 * Every imported object is reconstructed from allowlisted keys. JSON is the
 * lossless, bilingual editable format. DOCX contains the current language;
 * DOCX import provides a best-effort draft and the complete extracted text.
 */
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_XML_BYTES = 16 * 1024 * 1024;
const MAX_TEXT = 200000;
const SECTION_LIMIT = 60;
const BULLET_LIMIT = 40;
const MAX_PHOTO_LENGTH = 2 * 1024 * 1024;
const BASE_STYLE = {
  fontCN: 'Arial Unicode MS',
  fontEN: 'Arial',
  bodySize: 10.5,
  titleSize: 22,
  lineHeight: 1.35,
  marginMm: 16,
  accent: '#111111',
};
const FONTS = new Set([
  'Arial Unicode MS',
  'Arial',
  'Microsoft YaHei',
  'PingFang SC',
  'SimSun',
  'SimHei',
  'Noto Sans SC',
  'Noto Sans CJK SC',
  'Noto Serif SC',
  'Source Han Sans SC',
  'Source Han Serif SC',
  'Times New Roman',
  'Calibri',
  'Helvetica',
  'Georgia',
  '宋体',
  '黑体',
  '微软雅黑',
  '思源黑体',
  '思源宋体',
]);

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function clean(value, max = 2000) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .slice(0, max)
    .trim();
}
function textField(obj, key, max, warnings, path) {
  const value = obj[key];
  if (value !== undefined && typeof value !== 'string')
    throw new Error(`${path}.${key} 必须为文本。`);
  if (typeof value === 'string' && value.length > max)
    warnings.push(`${path}.${key} 超过 ${max} 字，已截断。`);
  return clean(value || '', max);
}
function arrayField(obj, key, limit, path) {
  if (!Array.isArray(obj[key])) throw new Error(`${path}.${key} 必须为数组。`);
  if (obj[key].length > limit)
    throw new Error(`${path}.${key} 最多支持 ${limit} 项，请拆分文件后再导入。`);
  return obj[key];
}
function entryId(raw, prefix, index) {
  const id = clean(raw, 80);
  return /^[a-zA-Z0-9_-]+$/.test(id) ? id : `${prefix}-${index + 1}`;
}
function photoInfo(value) {
  if (typeof value !== 'string' || value.length > MAX_PHOTO_LENGTH)
    throw new Error('照片须为不超过 2 MB 的 JPEG、PNG 或 WebP data URL。');
  const match = value.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[2].length % 4 !== 0)
    throw new Error('照片格式无效，仅支持 JPEG、PNG 或 WebP 的 base64 数据。');
  let binary;
  try {
    binary = atob(match[2]);
  } catch {
    throw new Error('照片 base64 数据损坏。');
  }
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const text = (start, length) => String.fromCharCode(...bytes.slice(start, start + length));
  const u32be = (pos) =>
    bytes[pos] * 16777216 + (bytes[pos + 1] << 16) + (bytes[pos + 2] << 8) + bytes[pos + 3];
  const u32le = (pos) =>
    (bytes[pos] || 0) +
    ((bytes[pos + 1] || 0) << 8) +
    ((bytes[pos + 2] || 0) << 16) +
    (bytes[pos + 3] || 0) * 16777216;
  let type = '',
    width = 0,
    height = 0;
  if (
    bytes.length >= 24 &&
    bytes[0] === 137 &&
    text(1, 3) === 'PNG' &&
    bytes[4] === 13 &&
    bytes[5] === 10 &&
    bytes[6] === 26 &&
    bytes[7] === 10 &&
    text(12, 4) === 'IHDR'
  ) {
    type = 'png';
    width = u32be(16);
    height = u32be(20);
  } else if (bytes.length >= 12 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    type = 'jpeg';
    let position = 2;
    while (position + 9 < bytes.length) {
      if (bytes[position++] !== 255) continue;
      while (bytes[position] === 255) position++;
      const marker = bytes[position++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      const length = (bytes[position] << 8) + bytes[position + 1];
      if (length < 2 || position + length > bytes.length) break;
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
        height = (bytes[position + 3] << 8) + bytes[position + 4];
        width = (bytes[position + 5] << 8) + bytes[position + 6];
        break;
      }
      position += length;
    }
  } else if (bytes.length >= 30 && text(0, 4) === 'RIFF' && text(8, 4) === 'WEBP') {
    type = 'webp';
    let position = 12;
    while (position + 8 <= bytes.length) {
      const chunk = text(position, 4),
        length = u32le(position + 4),
        payload = position + 8;
      if (payload + length > bytes.length) break;
      if (chunk === 'VP8X' && length >= 10) {
        width = 1 + bytes[payload + 4] + (bytes[payload + 5] << 8) + (bytes[payload + 6] << 16);
        height = 1 + bytes[payload + 7] + (bytes[payload + 8] << 8) + (bytes[payload + 9] << 16);
        break;
      }
      if (chunk === 'VP8L' && length >= 5 && bytes[payload] === 47) {
        width = 1 + bytes[payload + 1] + ((bytes[payload + 2] & 63) << 8);
        height =
          1 +
          (bytes[payload + 2] >> 6) +
          (bytes[payload + 3] << 2) +
          ((bytes[payload + 4] & 15) << 10);
        break;
      }
      if (
        chunk === 'VP8 ' &&
        length >= 10 &&
        bytes[payload + 3] === 157 &&
        bytes[payload + 4] === 1 &&
        bytes[payload + 5] === 42
      ) {
        width = (bytes[payload + 6] + (bytes[payload + 7] << 8)) & 16383;
        height = (bytes[payload + 8] + (bytes[payload + 9] << 8)) & 16383;
        break;
      }
      position = payload + length + (length % 2);
    }
  }
  if (type !== match[1]) throw new Error('照片声明类型与实际文件内容不符。');
  if (!width || !height || width > 4096 || height > 4096 || width * height > 16000000)
    throw new Error('照片尺寸无效或过大，请重新上传不超过 4096 × 4096 的图片。');
  return { bytes, type, width, height, mime: `image/${type}` };
}
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
function normalizeProfile(value, lang, warnings) {
  if (!record(value) || !record(value.basics))
    throw new Error(`profiles.${lang} 缺少有效的 basics。`);
  const root = `profiles.${lang}`;
  const basics = {};
  for (const key of ['name', 'phone', 'email', 'target', 'salary', 'links']) {
    const max = key === 'links' ? 1500 : key === 'salary' ? 120 : 300;
    basics[key] = textField(value.basics, key, max, warnings, `${root}.basics`);
  }
  for (const key of ['photo', 'photoOriginal'])
    if (value.basics[key] !== undefined) {
      if (value.basics[key] === '') basics[key] = '';
      else {
        try {
          photoInfo(value.basics[key]);
          basics[key] = value.basics[key];
        } catch (error) {
          warnings.push(`${root}.basics.${key}：${error.message} 已跳过此照片。`);
        }
      }
    }
  if (value.basics.photoPosition !== undefined) {
    basics.photoPosition = ['center', 'top', 'bottom'].includes(value.basics.photoPosition)
      ? value.basics.photoPosition
      : 'center';
    if (basics.photoPosition !== value.basics.photoPosition)
      warnings.push(`${root}.basics.photoPosition 无效，已使用 center。`);
  }
  function entries(key, fields) {
    const seen = new Set();
    return arrayField(value, key, SECTION_LIMIT, root).map((item, index) => {
      if (!record(item)) throw new Error(`${root}.${key}[${index}] 必须为对象。`);
      const path = `${root}.${key}[${index}]`;
      let id = entryId(item.id, `${lang}-${key}`, index);
      if (seen.has(id)) {
        warnings.push(`${path} 的重复标识已重新生成。`);
        let serial = index + 1;
        do {
          id = `${lang}-${key}-normalized-${serial++}`;
        } while (seen.has(id));
      }
      seen.add(id);
      const output = { id };
      for (const [field, max] of fields)
        output[field] = textField(item, field, max, warnings, path);
      if (key === 'experience' || key === 'projects') {
        output.bullets = arrayField(item, 'bullets', BULLET_LIMIT, path).map(
          (bullet, bulletIndex) => {
            if (typeof bullet !== 'string')
              throw new Error(`${path}.bullets[${bulletIndex}] 必须为文本。`);
            if (bullet.length > 5000) warnings.push(`${path} 的一条描述超过 5000 字，已截断。`);
            return clean(bullet, 5000);
          },
        );
      }
      return output;
    });
  }
  return {
    basics,
    education: entries('education', [
      ['school', 400],
      ['degree', 200],
      ['major', 400],
      ['start', 80],
      ['end', 80],
      ['gpa', 120],
      ['rank', 200],
      ['courses', 3000],
    ]),
    experience: entries('experience', [
      ['company', 400],
      ['role', 400],
      ['start', 80],
      ['end', 80],
    ]),
    projects: entries('projects', [
      ['title', 600],
      ['award', 400],
      ['start', 80],
      ['end', 80],
    ]),
    skills: entries('skills', [
      ['label', 200],
      ['text', 5000],
    ]),
  };
}
function numberStyle(value, fallback, min, max) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}
export function normalizeState(input, warnings = []) {
  if (!record(input) || input.version !== 1)
    throw new Error('请选择本编辑器导出的版本 1 JSON 文件。');
  if (input.language !== 'zh' && input.language !== 'en')
    throw new Error('language 只能是 zh 或 en。');
  if (!record(input.profiles) || !record(input.profiles.zh) || !record(input.profiles.en)) {
    throw new Error('JSON 必须包含完整的 profiles.zh 和 profiles.en。');
  }
  const raw = record(input.style) ? input.style : {};
  const font = (key) => (FONTS.has(raw[key]) ? raw[key] : BASE_STYLE[key]);
  if (raw.fontCN && !FONTS.has(raw.fontCN))
    warnings.push('中文字体不在支持列表，已使用 Arial Unicode MS。');
  if (raw.fontEN && !FONTS.has(raw.fontEN)) warnings.push('英文字体不在支持列表，已使用 Arial。');
  const result = {
    version: 1,
    language: input.language,
    meta: { title: clean(input.meta?.title, 200) || '我的简历' },
    style: {
      fontCN: font('fontCN'),
      fontEN: font('fontEN'),
      bodySize: numberStyle(raw.bodySize, 10.5, 8, 16),
      titleSize: numberStyle(raw.titleSize, 22, 16, 36),
      lineHeight: numberStyle(raw.lineHeight, 1.35, 1, 2),
      marginMm: numberStyle(raw.marginMm, 16, 10, 28),
      accent:
        typeof raw.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw.accent)
          ? raw.accent
          : '#111111',
    },
    profiles: {
      zh: normalizeProfile(input.profiles.zh, 'zh', warnings),
      en: normalizeProfile(input.profiles.en, 'en', warnings),
    },
  };
  if (input.referenceFontAudit !== undefined) {
    const audit = input.referenceFontAudit;
    if (!record(audit) || !Array.isArray(audit.fonts))
      throw new Error('referenceFontAudit 必须包含字体名称数组。');
    if (audit.fonts.some((item) => typeof item !== 'string'))
      throw new Error('参考字体名称必须为文本。');
    if (audit.fonts.length > 30) warnings.push('参考字体记录最多保留 30 个名称。');
    result.referenceFontAudit = {
      fonts: [
        ...new Set(
          audit.fonts
            .slice(0, 30)
            .map((item) => clean(item, 200))
            .filter(Boolean),
        ),
      ],
      fileName: textField(audit, 'fileName', 200, warnings, 'referenceFontAudit'),
      checkedAt: textField(audit, 'checkedAt', 80, warnings, 'referenceFontAudit'),
      verified: false,
    };
  }
  return result;
}
function safeFilename(state, extension) {
  const profile = state.profiles[state.language];
  const title = (state.meta?.title || '').trim().replace(/\s*\/\s*/g, '-');
  const base =
    title ||
    [profile.basics.name || 'Resume', state.language === 'zh' ? '中文简历' : 'English_Resume'].join(
      '_',
    );
  return (
    base
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/[\x00-\x1f]/g, '')
      .slice(0, 110) +
    '.' +
    extension
  );
}
function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function exportJson(input) {
  const warnings = [];
  const state = normalizeState(input, warnings);
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  download(blob, safeFilename(state, 'json'));
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
  const font = { name: s.fontEN, eastAsia: s.fontCN };
  const line = Math.round(s.lineHeight * 240);
  const body = Math.round(s.bodySize * 2);
  const color = s.accent.replace('#', '');
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
  if (p.basics.photo) {
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
      paragraph([run(title, { bold: true, size: body + 1 })], {
        border: { bottom: { color, size: 4, space: 3, style: d.BorderStyle.SINGLE } },
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
  download(blob, safeFilename(state, 'docx').replace(/\.docx$/, '_可编辑版.docx'));
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
    if (extension === 'pdf')
      throw new Error(
        '当前支持 JSON、Word (.docx)、TXT 和 Markdown 导入。PDF 请先转换为可编辑 Word 或文字。',
      );
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
  download(blob, safeFilename(state, 'docx').replace(/\.docx$/, '_图片版.docx'));
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
  download(blob, safeFilename(state, 'pdf'));
  return blob;
}

export function exportPrint() {
  window.print();
}
