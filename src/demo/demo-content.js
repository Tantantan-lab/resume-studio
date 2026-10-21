import { defaultState, demoRoles } from './data.js';
const clone = (value) => JSON.parse(JSON.stringify(value));

export function createDemoState(roleIndex = 0, language = 'zh') {
  const state = clone(defaultState);
  const role = demoRoles[roleIndex] || demoRoles[0];
  state.language = language === 'zh' ? 'zh' : 'en';
  for (const lang of ['zh', 'en']) {
    state.profiles[lang].basics.target = role[lang];
    state.profiles[lang].basics.salary = lang === 'zh' ? '面议' : role.salary;
    if (role.order)
      state.profiles[lang].skills = role.order.map((index) => state.profiles[lang].skills[index]);
  }
  state.meta.title = `${role.zh} · 演示`;
  return state;
}

function replaceDemoState(candidate, preservePhoto = false) {
  const roleIndex = demoRoles.findIndex((role) => role.zh === candidate.profiles.zh.basics.target);
  const replacement = createDemoState(roleIndex);
  if (preservePhoto) {
    for (const lang of ['zh', 'en']) {
      const previous = candidate.profiles[lang].basics;
      if (previous.photo) {
        replacement.profiles[lang].basics.photo = previous.photo;
        replacement.profiles[lang].basics.photoOriginal = previous.photoOriginal || previous.photo;
        replacement.profiles[lang].basics.photoPosition = previous.photoPosition || 'center';
      }
    }
  }
  candidate.profiles = replacement.profiles;
  candidate.meta = { ...candidate.meta, title: replacement.meta.title };
  candidate.language = 'zh';
  return true;
}

// Exact dual-language matches keep unrelated personal profiles out of demo migrations.
export function replaceLegacyDemoState(candidate) {
  const zh = candidate?.profiles?.zh?.basics;
  const en = candidate?.profiles?.en?.basics;
  if (
    zh?.name !== '林小溪' ||
    en?.name !== 'XIAOXI LIN' ||
    zh.email !== 'demo@example.com' ||
    en.email !== 'demo@example.com'
  )
    return false;
  return replaceDemoState(candidate, true);
}

export function replacePreviousDemoState(candidate) {
  const zh = candidate?.profiles?.zh?.basics;
  const en = candidate?.profiles?.en?.basics;
  if (
    zh?.name !== '陈知遥' ||
    en?.name !== 'ZHIYAO CHEN' ||
    zh.email !== 'zhiyao.chen@example.com' ||
    en.email !== 'zhiyao.chen@example.com'
  )
    return false;
  return replaceDemoState(candidate);
}

// The Chinese profile returns to the Chen Zhiyao demo while the English
// profile stays Emily Carter. Matches only known fictional demo emails.
export function replaceShowcaseChineseState(candidate) {
  const zh = candidate?.profiles?.zh?.basics;
  const en = candidate?.profiles?.en?.basics;
  if (en?.name !== 'Emily Carter' || en.email !== 'emily.carter@example.com') return false;
  if (zh?.email !== 'emily.carter@example.com' && zh?.email !== 'zhiyao.chen@example.com')
    return false;
  if (zh?.name === '陈知遥' && candidate.language === 'zh') return false;
  const roleIndex = demoRoles.findIndex((role) => role.zh === zh?.target);
  const replacement = createDemoState(roleIndex >= 0 ? roleIndex : 0);
  for (const lang of ['zh', 'en']) {
    const previous = candidate.profiles[lang].basics;
    if (previous.photo) {
      replacement.profiles[lang].basics.photo = previous.photo;
      replacement.profiles[lang].basics.photoOriginal = previous.photoOriginal || previous.photo;
      replacement.profiles[lang].basics.photoPosition = previous.photoPosition || 'center';
    }
  }
  candidate.profiles = replacement.profiles;
  candidate.meta = { ...candidate.meta, title: replacement.meta.title };
  candidate.language = 'zh';
  return true;
}
