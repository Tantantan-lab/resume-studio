// Shared, DOM-free resume schema used by both the browser and local Agent.
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

export { clean, photoInfo };
