import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAppliedTheme } from './themeUtils';

test('resolveAppliedTheme handles explicit dark and light modes', () => {
  assert.equal(resolveAppliedTheme('dark', false), 'dark');
  assert.equal(resolveAppliedTheme('dark', true), 'dark');
  assert.equal(resolveAppliedTheme('light', true), 'light');
  assert.equal(resolveAppliedTheme('light', false), 'light');
  assert.equal(resolveAppliedTheme(undefined, false), 'dark');
});

test('resolveAppliedTheme follows system preference when set to system', () => {
  assert.equal(resolveAppliedTheme('system', true), 'dark');
  assert.equal(resolveAppliedTheme('system', false), 'light');
});
