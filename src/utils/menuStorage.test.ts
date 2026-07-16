import { beforeEach, describe, expect, it } from 'vitest';
import { MENU_OPTIONS } from '../types';
import {
  LOCKED_MENUS,
  isMenuEnabled,
  menuLabel,
  resetMenuSettings,
  savedMenuSettings,
  saveMenuSettings,
} from './menuStorage';

describe('menuStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('seeds defaults from MENU_OPTIONS when storage is empty or invalid', () => {
    const settings = savedMenuSettings();
    expect(settings).toHaveLength(MENU_OPTIONS.length);
    expect(settings.every(s => s.enabled)).toBe(true);

    localStorage.setItem('menu_settings', '{broken');
    expect(savedMenuSettings()).toHaveLength(MENU_OPTIONS.length);
  });

  it('persists rename and reorder', () => {
    const settings = savedMenuSettings();
    const reports = settings.find(s => s.key === 'reports')!;
    reports.label = 'รายงานสถิติ';
    reports.order = -1; // move to the top
    saveMenuSettings(settings);

    const reloaded = savedMenuSettings();
    expect(reloaded[0].key).toBe('reports');
    expect(menuLabel('reports')).toBe('รายงานสถิติ');
    expect(menuLabel('map')).toBe('แผนที่กล้อง'); // untouched keeps default
  });

  it('disable persists, but locked menus can never be disabled', () => {
    const settings = savedMenuSettings().map(s => ({ ...s, enabled: false }));
    saveMenuSettings(settings);

    expect(isMenuEnabled('dashboard')).toBe(false);
    for (const locked of LOCKED_MENUS) {
      expect(isMenuEnabled(locked)).toBe(true);
    }
  });

  it('drops stored keys that no longer exist in MENU_OPTIONS', () => {
    localStorage.setItem('menu_settings', JSON.stringify([
      { key: 'ghost-menu', label: 'เมนูผี', order: 0, enabled: true },
    ]));
    const settings = savedMenuSettings();
    expect(settings.some(s => (s.key as string) === 'ghost-menu')).toBe(false);
    expect(settings).toHaveLength(MENU_OPTIONS.length);
  });

  it('reset restores all defaults', () => {
    const settings = savedMenuSettings();
    settings[0].label = 'เปลี่ยนชื่อ';
    settings[0].enabled = false;
    saveMenuSettings(settings);
    resetMenuSettings();
    expect(savedMenuSettings()[0].label).toBe(MENU_OPTIONS[0].label);
    expect(isMenuEnabled(MENU_OPTIONS[0].key)).toBe(true);
  });
});
