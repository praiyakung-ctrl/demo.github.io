import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { MenuKey, PermissionAction, User, UserRole } from '../types';
import usersData from '../data/users.json';
import { groupForUser, hasPermission } from '../utils/groupStorage';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  loginAsGoogle: (profile?: { name: string; email: string }) => void;
  logout: () => void;
  isAdmin: boolean;
  isOperator: boolean;
  isExecutive: boolean;
  isCitizen: boolean;
  canEdit: boolean;
  /* group-based permission check: may the current user perform `action` in `menu`? */
  can: (menu: MenuKey, action: PermissionAction) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (username: string, password: string): boolean => {
    const found = (usersData as User[]).find(
      u => u.username === username && u.password === password && u.isActive
    );
    if (found) {
      setUser(found);
      localStorage.setItem('auth_user', JSON.stringify(found));
      return true;
    }
    return false;
  };

  const loginAsGoogle = (profile?: { name: string; email: string }) => {
    const citizen: User = {
      id: 'citizen-001',
      name: profile?.name ?? 'ประชาชน ทดสอบ',
      username: 'citizen',
      role: 'citizen' as UserRole,
      email: profile?.email ?? 'citizen@gmail.com',
      isActive: true,
    };
    setUser(citizen);
    localStorage.setItem('auth_user', JSON.stringify(citizen));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  const role = user?.role;

  // groups are read fresh on every check so edits on /admin/groups take effect
  // as soon as the user navigates (no stale cache)
  const can = (menu: MenuKey, action: PermissionAction): boolean => {
    if (!user) return false;
    return hasPermission(groupForUser(user), menu, action);
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      loginAsGoogle,
      logout,
      isAdmin: role === 'admin',
      isOperator: role === 'operator',
      isExecutive: role === 'executive',
      isCitizen: role === 'citizen',
      canEdit: role === 'admin' || role === 'operator',
      can,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- conventional context hook co-located with its provider
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
