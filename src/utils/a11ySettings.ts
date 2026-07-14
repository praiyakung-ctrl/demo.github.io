/* Shared persistence for the accessibility toolbar (font scale + high contrast).
   Applied to <html> so every rem-based size in the app scales. */

export const FONT_SCALES = [100, 112.5, 125] as const;
export const FONT_KEY = 'a11y_font_scale';
export const CONTRAST_KEY = 'a11y_high_contrast';

export function applyFontScale(scale: number) {
  document.documentElement.style.fontSize = `${scale}%`;
}

export function applyContrast(on: boolean) {
  document.documentElement.classList.toggle('high-contrast', on);
}

export function savedFontScale(): number {
  const saved = Number(localStorage.getItem(FONT_KEY));
  return FONT_SCALES.includes(saved as typeof FONT_SCALES[number]) ? saved : 100;
}

export function savedContrast(): boolean {
  return localStorage.getItem(CONTRAST_KEY) === 'true';
}

export function loadA11ySettings() {
  applyFontScale(savedFontScale());
  applyContrast(savedContrast());
}
