import { defaultState, demoRegion, demoRoles } from './data.js';
const clone = (value) => JSON.parse(JSON.stringify(value));

export function createDemoState(roleIndex = 0, language = 'zh') {
  const state = clone(defaultState);
  const role = demoRoles[roleIndex] || demoRoles[0];
  state.language = language === 'en' ? 'en' : 'zh';
  for (const lang of ['zh', 'en']) {
    state.profiles[lang].basics.target = role[lang];
    state.profiles[lang].basics.salary = role.salary;
    if (role.order)
      state.profiles[lang].skills = role.order.map((index) => state.profiles[lang].skills[index]);
  }
  state.meta.title = `${role.zh} ${role.salary} ${demoRegion}`;
  return state;
}

// Exact dual-language match prevents replacing personal or partially customized identities.
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
  const roleIndex = demoRoles.findIndex((role) => role.zh === zh.target);
  const replacement = createDemoState(roleIndex, candidate.language);
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
  return true;
}
