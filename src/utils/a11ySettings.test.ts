import { beforeEach, describe, expect, it } from 'vitest';
import {
  CONTRAST_KEY,
  FONT_KEY,
  applyContrast,
  applyFontScale,
  loadA11ySettings,
  savedContrast,
  savedFontScale,
} from './a11ySettings';

describe('a11ySettings', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.fontSize = '';
    document.documentElement.classList.remove('high-contrast');
  });

  it('savedFontScale falls back to 100 when nothing is stored', () => {
    expect(savedFontScale()).toBe(100);
  });

  it('savedFontScale falls back to 100 on an invalid value', () => {
    localStorage.setItem(FONT_KEY, '999');
    expect(savedFontScale()).toBe(100);
  });

  it('savedFontScale returns a stored valid scale', () => {
    localStorage.setItem(FONT_KEY, '125');
    expect(savedFontScale()).toBe(125);
  });

  it('savedContrast is true only for the string "true"', () => {
    expect(savedContrast()).toBe(false);
    localStorage.setItem(CONTRAST_KEY, 'true');
    expect(savedContrast()).toBe(true);
  });

  it('applyFontScale sets the root font-size percentage', () => {
    applyFontScale(112.5);
    expect(document.documentElement.style.fontSize).toBe('112.5%');
  });

  it('applyContrast toggles the high-contrast class', () => {
    applyContrast(true);
    expect(document.documentElement.classList.contains('high-contrast')).toBe(true);
    applyContrast(false);
    expect(document.documentElement.classList.contains('high-contrast')).toBe(false);
  });

  it('loadA11ySettings applies stored values to <html>', () => {
    localStorage.setItem(FONT_KEY, '125');
    localStorage.setItem(CONTRAST_KEY, 'true');
    loadA11ySettings();
    expect(document.documentElement.style.fontSize).toBe('125%');
    expect(document.documentElement.classList.contains('high-contrast')).toBe(true);
  });
});
