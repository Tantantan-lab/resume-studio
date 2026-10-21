import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultState } from '../src/demo/data.js';
import { applyDemoPhotoToState, demoPhoto } from '../src/demo/demo-photo.js';
const clone = (value) => JSON.parse(JSON.stringify(value));

test('new demo profiles include the same small JPEG in both languages', () => {
  assert.ok(demoPhoto.startsWith('data:image/jpeg;base64,'));
  assert.ok(demoPhoto.length < 100000);
  for (const lang of ['zh', 'en'])
    assert.equal(defaultState.profiles[lang].basics.photo, demoPhoto);
});

test('older demo profiles receive a photo without losing content', () => {
  const old = clone(defaultState);
  old.profiles.zh.basics.name = '林小溪';
  old.profiles.en.basics.name = 'XIAOXI LIN';
  for (const lang of ['zh', 'en']) old.profiles[lang].basics.email = 'demo@example.com';
  for (const lang of ['zh', 'en']) {
    delete old.profiles[lang].basics.photo;
    delete old.profiles[lang].basics.photoOriginal;
  }
  const originalText = old.profiles.zh.experience[0].bullets[0];
  assert.equal(applyDemoPhotoToState(old), true);
  assert.equal(old.profiles.zh.experience[0].bullets[0], originalText);
  assert.equal(old.profiles.en.basics.photo, demoPhoto);
  assert.equal(applyDemoPhotoToState(old), false);
});

test('demo migration preserves user photos and real profiles', () => {
  const real = clone(defaultState);
  real.profiles.zh.basics.photo = 'custom-user-photo';
  real.profiles.en.basics.name = 'Actual User';
  real.profiles.en.basics.email = 'user@example.org';
  delete real.profiles.en.basics.photo;
  assert.equal(applyDemoPhotoToState(real), false);
  assert.equal(real.profiles.zh.basics.photo, 'custom-user-photo');
  assert.equal(real.profiles.en.basics.photo, undefined);
});
