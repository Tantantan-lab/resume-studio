import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultState, demoRoles } from '../src/demo/data.js';
import {
  createDemoState,
  replaceLegacyDemoState,
  replacePreviousDemoState,
  replaceShowcaseChineseState,
} from '../src/demo/demo-content.js';
const clone = (value) => JSON.parse(JSON.stringify(value));
function legacyState() {
  const state = clone(defaultState);
  state.profiles.zh.basics.name = '林小溪';
  state.profiles.en.basics.name = 'XIAOXI LIN';
  for (const lang of ['zh', 'en']) {
    state.profiles[lang].basics.email = 'demo@example.com';
    state.profiles[lang].experience[0].company = 'legacy-content-marker';
    state.profiles[lang].projects[0].title = 'legacy-content-marker';
  }
  return state;
}

test('fictional bilingual defaults are consistent and contain no previous resume claims', () => {
  const text = JSON.stringify(defaultState.profiles);
  for (const fragment of [
    'Ozon',
    'APEC',
    '农资',
    '丰禾',
    '星野',
    '雅思',
    'IELTS',
    'TEMU',
    '数字贸易',
    'Paid Internship',
  ])
    assert.ok(!text.includes(fragment), `old content remains: ${fragment}`);
  for (const lang of ['zh', 'en']) {
    const profile = defaultState.profiles[lang];
    assert.ok(/虚构|Fictional/.test(profile.basics.links));
    assert.equal(
      profile.basics.email,
      lang === 'zh' ? 'zhiyao.chen@example.com' : 'emily.carter@example.com',
    );
    assert.equal(profile.experience.length, 2);
    assert.equal(profile.projects.length, 2);
    assert.deepEqual(
      profile.experience.map(({ start, end }) => [start, end]),
      defaultState.profiles.zh.experience.map(({ start, end }) => [start, end]),
    );
  }
});

test('all five role variants use only the new fictional content', () => {
  assert.equal(demoRoles.length, 5);
  demoRoles.forEach((role, index) => {
    const state = createDemoState(index, 'en');
    assert.equal(state.language, 'en');
    assert.equal(state.profiles.zh.basics.target, role.zh);
    assert.equal(state.profiles.en.basics.target, role.en);
    assert.ok(state.meta.title.endsWith(' · 演示'));
    assert.equal(state.profiles.zh.basics.name, '陈知遥');
  });
});

test('legacy demo replacement removes old content, retains layout and photos, and is idempotent', () => {
  const state = legacyState();
  state.profiles.zh.basics.target = demoRoles[1].zh;
  state.profiles.zh.basics.photo = 'existing-demo-photo';
  state.style.bodySize = 11;
  assert.equal(replaceLegacyDemoState(state), true);
  assert.ok(!JSON.stringify(state).includes('legacy-content-marker'));
  assert.equal(state.profiles.en.basics.name, 'Emily Carter');
  assert.equal(state.profiles.zh.basics.target, demoRoles[1].zh);
  assert.equal(state.profiles.zh.basics.photo, 'existing-demo-photo');
  assert.equal(state.style.bodySize, 11);
  assert.equal(replaceLegacyDemoState(state), false);
});

test('personal and mixed identities are preserved without partial replacement', () => {
  for (const lang of ['zh', 'en']) {
    const state = legacyState();
    state.profiles[lang].basics.email = 'actual-user@example.org';
    const before = JSON.stringify(state);
    assert.equal(replaceLegacyDemoState(state), false);
    assert.equal(JSON.stringify(state), before);
  }
});

test('English showcase upgrade changes only the exact previous demo persona', () => {
  assert.equal(defaultState.language, 'zh');
  assert.equal(defaultState.style.template, 'minimal');
  const previous = clone(defaultState);
  previous.profiles.zh.basics.name = '陈知遥';
  previous.profiles.en.basics.name = 'ZHIYAO CHEN';
  for (const lang of ['zh', 'en']) previous.profiles[lang].basics.email = 'zhiyao.chen@example.com';
  const personal = clone(previous);
  personal.profiles.en.basics.email = 'personal@example.org';
  const before = JSON.stringify(personal);
  assert.equal(replacePreviousDemoState(personal), false);
  assert.equal(JSON.stringify(personal), before);
  assert.equal(replacePreviousDemoState(previous), true);
  assert.equal(previous.language, 'zh');
  assert.equal(previous.profiles.zh.basics.name, '陈知遥');
  assert.equal(previous.profiles.en.basics.name, 'Emily Carter');
  assert.equal(replacePreviousDemoState(previous), false);
});

test('Chinese profile restore keeps the English persona and existing photo', () => {
  const state = clone(defaultState);
  state.profiles.zh.basics.name = '艾米莉·卡特';
  state.profiles.zh.basics.email = 'emily.carter@example.com';
  state.profiles.zh.basics.photo = 'existing-demo-photo';
  state.language = 'en';
  assert.equal(replaceShowcaseChineseState(state), true);
  assert.equal(state.language, 'zh');
  assert.equal(state.profiles.zh.basics.name, '陈知遥');
  assert.equal(state.profiles.en.basics.name, 'Emily Carter');
  assert.equal(state.profiles.zh.basics.photo, 'existing-demo-photo');
  assert.equal(replaceShowcaseChineseState(state), false);
});
