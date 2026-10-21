import {
  normalizeState as normalizeBrowserState,
  sortProjectsByDate,
} from '../../src/lib/schema.js';
import { autoResumeName, LEGACY_TITLES } from '../../src/lib/resume-utils.js';

// Agent-side wrapper around the exact same normalizer the browser uses.
// Keep only agent-specific policy here: region-aware titles, project order and warnings.
export function normalizeState(input, warnings = []) {
  const region =
    typeof input?.meta?.region === 'string' && input.meta.region.trim()
      ? input.meta.region.trim().slice(0, 40)
      : '深圳';
  const state = normalizeBrowserState(input, warnings);

  sortProjectsByDate(state.profiles.zh);
  sortProjectsByDate(state.profiles.en);

  if (LEGACY_TITLES.has(state.meta.title)) {
    state.meta.title = autoResumeName(state.profiles[state.language], region);
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
