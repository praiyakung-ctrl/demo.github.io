import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { MenuKey, PermissionAction, User, UserRole } from '../types';
import { groupForUser, hasPermission } from '../utils/groupStorage';
import { savedUsers } from '../utils/userStorage';
import { findMemberByNationalId, findMemberByEmail } from '../utils/memberStorage';
import { logAudit } from '../utils/auditLog';
import type { ThaIdProfile } from '../utils/thaId';
import type { GoogleProfile } from '../utils/googleAuth';

interface AuthContextType {
  user: User | null;
  loginWithThaId: (profile: ThaIdProfile) => boolean;
  loginWithGoogle: (profile: GoogleProfile) => boolean;
  /* patches the current session (e.g. after editing /profile) — does not touch
     the persisted user/member store, callers must save that separately */
  updateUser: (u: User) => void;
  logout: () => void;
  isAdmin: boolean;
  isOperator: boolean;
  isExecutive: boolean;
  isCitizen: boolean;
  isPolice: boolean;
  isLocalOfficer: boolean;
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
    if (member && member.status === 'approved') {
      const citizen: User = {
        id: member.id,
        name: member.name,
        username: member.email,
        role: 'citizen' as UserRole,
        email: member.email,
        isActive: true,
        nationalId: member.nationalId,
        picture: member.picture,
        mustChangePassword: member.mustChangePassword,
      };
      persistLogin(citizen, 'เข้าสู่ระบบด้วย ThaID');
      return true;
    }

    return false;
  };

  // foreign nationals have no Thai national ID — they verify with Google
  // OAuth instead, matched to their registered CitizenMember by email
  const loginWithGoogle = (profile: GoogleProfile): boolean => {
    const member = findMemberByEmail(profile.email);
    if (member && member.status === 'approved') {
      const citizen: User = {
        id: member.id,
        name: member.name,
        username: member.email,
        role: 'citizen' as UserRole,
        email: member.email,
        isActive: true,
        passportNumber: member.passportNumber,
        picture: member.picture,
        mustChangePassword: member.mustChangePassword,
      };
      persistLogin(citizen, 'เข้าสู่ระบบด้วย Google (ชาวต่างชาติ)');
      return true;
    }

    return false;
  };

  const updateUser = (u: User) => {
    setUser(u);
    localStorage.setItem('auth_user', JSON.stringify(u));
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
      loginWithGoogle,
      updateUser,
      logout,
      isAdmin: role === 'admin',
      isOperator: role === 'operator',
      isExecutive: role === 'executive',
      isCitizen: role === 'citizen',
      isPolice: role === 'police',
      isLocalOfficer: role === 'localOfficer',
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
