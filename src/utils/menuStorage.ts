import { MENU_OPTIONS } from '../types';
import type { MenuKey, MenuSetting } from '../types';

const MENU_KEY = 'menu_settings';

/* Recovery tools can never be disabled — prevents admins locking themselves out */
export const LOCKED_MENUS: MenuKey[] = ['adminGroups', 'adminMenus'];

function defaults(): MenuSetting[] {
  return MENU_OPTIONS.map((m, i) => ({ key: m.key, label: m.label, order: i, enabled: true }));
}

/* Merge stored settings with MENU_OPTIONS so menus added in newer code versions
   appear automatically, and stored keys that no longer exist are dropped. */
export function savedMenuSettings(): MenuSetting[] {
  let stored: MenuSetting[] = [];
  try {
    const raw = localStorage.getItem(MENU_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) stored = parsed;
  } catch {
    stored = [];
  }
  const merged = defaults().map(def => {
    const s = stored.find(x => x.key === def.key);
    return s ? { ...def, ...s, enabled: LOCKED_MENUS.includes(def.key) ? true : s.enabled } : def;
  });
  return merged.sort((a, b) => a.order - b.order);
}

export function saveMenuSettings(settings: MenuSetting[]): void {
  localStorage.setItem(MENU_KEY, JSON.stringify(settings));
}

export function resetMenuSettings(): void {
  localStorage.removeItem(MENU_KEY);
}

export function menuLabel(key: MenuKey): string {
  return savedMenuSettings().find(s => s.key === key)?.label
    ?? MENU_OPTIONS.find(m => m.key === key)?.label
    ?? key;
}

export function isMenuEnabled(key: MenuKey): boolean {
  if (LOCKED_MENUS.includes(key)) return true;
  return savedMenuSettings().find(s => s.key === key)?.enabled ?? true;
}
