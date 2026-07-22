import { beforeEach, describe, expect, it } from 'vitest';
import { savedUsers, saveUsers } from './userStorage';

describe('userStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('seeds from users.json when storage is empty or invalid', () => {
    const seeded = savedUsers();
    expect(seeded.length).toBeGreaterThan(0);
    expect(seeded.some(u => u.username === 'admin')).toBe(true);

    localStorage.setItem('admin_users', '{broken');
    expect(savedUsers()).toEqual(seeded);
  });

  it('persists edits across reads', () => {
    const users = savedUsers();
    saveUsers([...users, {
      id: 'u-new', name: 'ผู้ใช้ใหม่', username: 'newuser', role: 'operator',
      email: 'new@chonburi.go.th', isActive: true, nationalId: '1100200000099',
    }]);
    const reloaded = savedUsers();
    expect(reloaded).toHaveLength(users.length + 1);
    expect(reloaded.find(u => u.id === 'u-new')?.name).toBe('ผู้ใช้ใหม่');
  });
});
