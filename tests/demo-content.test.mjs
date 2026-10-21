import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultState, demoRoles } from '../src/demo/data.js';
import { createDemoState, replaceLegacyDemoState } from '../src/demo/demo-content.js';
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
    assert.equal(profile.basics.email, 'zhiyao.chen@example.com');
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
    assert.ok(state.meta.title.endsWith('杭州'));
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
  assert.equal(state.profiles.en.basics.name, 'ZHIYAO CHEN');
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
