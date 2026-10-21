import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeState, profileHasContent } from '../src/lib/schema.js';
import { defaultState } from '../src/demo/data.js';

function stateWith({ entries = 1, bullets = 1 } = {}) {
  const state = structuredClone(defaultState);
  const make = (lang) =>
    Array.from({ length: entries }, (_, index) => ({
      id: `${lang}-e-${index}`,
      company: '示例公司',
      role: '实习',
      start: '2025-01',
      end: '2025-03',
      bullets: Array.from({ length: bullets }, (_, i) => `完成第 ${i + 1} 项工作。`),
    }));
  state.profiles.zh.experience = make('zh');
  state.profiles.en.experience = make('en');
  return state;
}

test('profileHasContent treats blank profiles as empty', () => {
  assert.equal(profileHasContent(null), false);
  assert.equal(
    profileHasContent({ basics: {}, education: [], experience: [], projects: [], skills: [] }),
    false,
  );
  assert.equal(
    profileHasContent({
      basics: {},
      education: [
        { id: 'x', school: '', major: '', start: '', end: '', courses: '', gpa: '', rank: '' },
      ],
      experience: [],
      projects: [],
      skills: [],
    }),
    false,
  );
});

test('profileHasContent detects real content while ignoring entry ids', () => {
  assert.equal(profileHasContent({ basics: { name: '张三' } }), true);
  assert.equal(
    profileHasContent({
      basics: {},
      experience: [{ id: 'x', company: '', role: '', bullets: ['完成一项工作'] }],
    }),
    true,
  );
  assert.equal(profileHasContent({ basics: {}, projects: [{ id: 'x', title: '校园项目' }] }), true);
});

test('oversized bullet lists are truncated with a warning instead of failing exports', () => {
  const warnings = [];
  const state = normalizeState(stateWith({ bullets: 45 }), warnings);
  assert.equal(state.profiles.zh.experience[0].bullets.length, 40);
  assert.ok(warnings.some((warning) => warning.includes('bullets') && warning.includes('截断')));
});

test('oversized sections are truncated with a warning instead of failing exports', () => {
  const warnings = [];
  const state = normalizeState(stateWith({ entries: 61 }), warnings);
  assert.equal(state.profiles.zh.experience.length, 60);
  assert.ok(warnings.some((warning) => warning.includes('experience') && warning.includes('截断')));
});

test('paper design survives JSON normalization through browser and Agent', async () => {
  const { normalizeState: agentNormalize } = await import('../scripts/lib/resume-schema.mjs');
  const { PAPER_TEMPLATES, applyPaperTemplate } = await import('../src/lib/paper-design.js');
  for (const template of PAPER_TEMPLATES) {
    const state = structuredClone(defaultState);
    const originalProfiles = structuredClone(state.profiles);
    state.style = {
      ...applyPaperTemplate(state.style, template.id),
      showPhoto: false,
      fillPage: true,
      accent: '#5b4d73',
    };
    const browser = normalizeState(JSON.parse(JSON.stringify(state)));
    const agent = agentNormalize(state, []);
    assert.equal(browser.style.template, template.id);
    assert.equal(browser.style.showPhoto, false);
    assert.equal(browser.style.fillPage, true);
    assert.equal(browser.style.accent, '#5b4d73');
    assert.deepEqual(agent.style, browser.style);
    assert.deepEqual(
      browser.profiles,
      normalizeState({ ...state, profiles: originalProfiles }).profiles,
    );
    assert.equal(browser.profiles.zh.basics.photo, state.profiles.zh.basics.photo);
  }
});

test('legacy and invalid paper designs use safe compatible defaults', () => {
  const state = structuredClone(defaultState);
  delete state.style.template;
  delete state.style.showPhoto;
  delete state.style.fillPage;
  const legacy = normalizeState(state);
  assert.equal(legacy.style.template, 'classic');
  assert.equal(legacy.style.showPhoto, true);
  assert.equal(legacy.style.fillPage, false);
  state.style.template = '<script>not-a-template</script>';
  state.style.showPhoto = 'false';
  state.style.accent = 'url(invalid)';
  const warnings = [];
  const safe = normalizeState(state, warnings);
  assert.equal(safe.style.template, 'classic');
  assert.equal(safe.style.showPhoto, true);
  assert.equal(safe.style.accent, '#111111');
  assert.ok(warnings.some((warning) => warning.includes('纸面模板')));
});
