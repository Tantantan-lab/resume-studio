import { normalizeState as normalizeBrowserState } from '../../src/io.js';

// Agent-side wrapper around the exact same normalizer the browser uses.
// Keep only agent-specific policy here: region-aware titles, project order and warnings.
export function normalizeState(input, warnings = []) {
  const region =
    typeof input?.meta?.region === 'string' && input.meta.region.trim()
      ? input.meta.region.trim().slice(0, 40)
      : '深圳';
  const state = normalizeBrowserState(input, warnings);

  for (const lang of ['zh', 'en']) {
    const dateValue = (item) => item.end || item.start || '';
    const projects = state.profiles[lang].projects;
    projects.sort((a, b) => {
      const av = dateValue(a);
      const bv = dateValue(b);
      if (!av && !bv) return 0;
      if (!av) return 1;
      if (!bv) return -1;
      return bv.localeCompare(av);
    });
  }

  const current = state.profiles[state.language].basics;
  const oldTitles = new Set(['我的海外运营简历', '我的简历', '']);
  if (oldTitles.has(state.meta.title)) {
    state.meta.title = [current.target || '未命名岗位', current.salary || '面议', region].join(' ');
  }

  checkFacts(state.profiles, warnings);
  return state;
}

function checkFacts(profiles, warnings) {
  const risky = /(精通|独立负责|操盘|年化|GMV|ROI|ACoS|FBA|SEO|SEM)/i;
  for (const lang of ['zh', 'en']) {
    const p = profiles[lang];
    const text = [
      ...p.experience.flatMap((item) => item.bullets),
      ...p.projects.flatMap((item) => item.bullets),
      ...p.skills.map((item) => item.text),
    ].join('\n');
    if (risky.test(text)) {
      warnings.push(
        `profiles.${lang} 含高风险自述词（精通/独立负责/ROI/ACoS 等），请人工确认是否有证据。`,
      );
    }
  }
}
