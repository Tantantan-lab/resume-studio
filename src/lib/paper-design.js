// Paper presets change presentation only. Profile content and photo data stay intact.
export const PAPER_TEMPLATES = [
  {
    id: 'classic',
    name: '经典单栏',
    english: 'CLASSIC',
    description: '居中抬头与清晰分节，保留熟悉的简历版式。',
    preset: {
      fontEN: 'Arial',
      bodySize: 10,
      titleSize: 22,
      lineHeight: 1.25,
      marginMm: 16,
      accent: '#111111',
    },
  },
  {
    id: 'minimal',
    name: '海外简洁',
    english: 'ESSENTIAL',
    description: '左对齐抬头、细线分节，适合突出经历与成果。',
    preset: {
      fontEN: 'Arial',
      bodySize: 10,
      titleSize: 26,
      lineHeight: 1.25,
      marginMm: 17,
      accent: '#253b55',
    },
  },
  {
    id: 'sidebar',
    name: '现代侧栏',
    english: 'SIDEBAR',
    description: '教育与技能放在侧栏，工作和项目形成主线。',
    preset: {
      fontEN: 'Arial',
      bodySize: 9.5,
      titleSize: 25,
      lineHeight: 1.25,
      marginMm: 13,
      accent: '#245c63',
    },
  },
  {
    id: 'editorial',
    name: '编辑式',
    english: 'EDITORIAL',
    description: '衬线字体与色条标题，适合内容、品牌及创意岗位。',
    preset: {
      fontEN: 'Georgia',
      bodySize: 10,
      titleSize: 28,
      lineHeight: 1.2,
      marginMm: 17,
      accent: '#754a3b',
    },
  },
];
export const PAPER_COLORS = [
  { color: '#111111', name: '墨黑' },
  { color: '#253b55', name: '海军蓝' },
  { color: '#245c63', name: '松石绿' },
  { color: '#754a3b', name: '暖棕' },
  { color: '#5b4d73', name: '烟紫' },
  { color: '#7b3441', name: '酒红' },
];
export function getPaperTemplate(id) {
  return PAPER_TEMPLATES.find((template) => template.id === id) || PAPER_TEMPLATES[0];
}
export function applyPaperTemplate(style, id) {
  const template = getPaperTemplate(id);
  return {
    ...style,
    ...template.preset,
    template: template.id,
    showPhoto: style?.showPhoto !== false,
  };
}
export function paperAccent(value) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : '#111111';
}
