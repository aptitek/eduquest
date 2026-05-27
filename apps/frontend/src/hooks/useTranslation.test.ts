import { describe, expect, it } from 'vitest';
import { resolveTranslation } from './useTranslation';

describe('resolveTranslation', () => {
  it('returns translated strings for existing keys', () => {
    expect(resolveTranslation('en', 'layout.title', true)).toBe('EduQuest');
  });

  it('marks missing keys visibly during development', () => {
    expect(resolveTranslation('en', 'layout.missingTitle', true)).toBe('[[MISSING I18N: layout.missingTitle]]');
  });

  it('keeps production fallback clean for missing keys', () => {
    expect(resolveTranslation('en', 'layout.missingTitle', false)).toBe('layout.missingTitle');
  });

  it('marks non-string translation paths as missing during development', () => {
    expect(resolveTranslation('en', 'layout', true)).toBe('[[MISSING I18N: layout]]');
  });
});
