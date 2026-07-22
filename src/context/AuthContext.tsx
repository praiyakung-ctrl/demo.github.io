import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { MenuKey, PermissionAction, User, UserRole } from '../types';
import { groupForUser, hasPermission } from '../utils/groupStorage';
import { savedUsers } from '../utils/userStorage';
import { findMemberByNationalId } from '../utils/memberStorage';
import { logAudit } from '../utils/auditLog';
import type { ThaIdProfile } from '../utils/thaId';

interface AuthContextType {
  user: User | null;
  loginWithThaId: (profile: ThaIdProfile) => boolean;
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

  const persistLogin = (u: User, detail: string) => {
    setUser(u);
    localStorage.setItem('auth_user', JSON.stringify(u));
    logAudit(u, 'login', 'ระบบ', detail);
  };

  // read through userStorage/memberStorage so accounts created/edited on
  // /admin/users or via /register can log in as soon as ThaID confirms them
  const loginWithThaId = (profile: ThaIdProfile): boolean => {
    const staff = savedUsers().find(u => u.nationalId === profile.nationalId && u.isActive);
    if (staff) {
      persistLogin(staff, 'เข้าสู่ระบบด้วย ThaID');
      return true;
    }

    const member = findMemberByNationalId(profile.nationalId);
    if (member) {
      const citizen: User = {
        id: member.id,
        name: member.name,
        username: member.email,
        role: 'citizen' as UserRole,
        email: member.email,
        isActive: true,
        nationalId: member.nationalId,
        picture: member.picture,
      };
      persistLogin(citizen, 'เข้าสู่ระบบด้วย ThaID');
      return true;
    }

    return false;
  };

  const logout = () => {
    if (user) logAudit(user, 'logout', 'ระบบ', 'ออกจากระบบ');
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
      loginWithThaId,
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
