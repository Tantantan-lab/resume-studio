import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeState } from '../src/lib/schema.js';
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
