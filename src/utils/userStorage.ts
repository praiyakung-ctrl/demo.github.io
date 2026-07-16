import usersData from '../data/users.json';
import type { User } from '../types';

const USERS_KEY = 'admin_users';

/* Users managed on /admin/users, persisted so edits survive refresh.
   Seeds from users.json on first use (or when storage is invalid). */
export function savedUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return usersData as User[];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : (usersData as User[]);
  } catch {
    return usersData as User[];
  }
}

export function saveUsers(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
