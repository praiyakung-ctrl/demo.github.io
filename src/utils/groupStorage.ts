import type { MenuKey, PermissionAction, User, UserGroup, UserRole } from '../types';

const GROUPS_KEY = 'user_groups';

const ALL: PermissionAction[] = ['view', 'create', 'edit', 'delete'];
const VIEW: PermissionAction[] = ['view'];
const NONE: PermissionAction[] = [];

/* System groups mirror the built-in roles so existing users keep working */
export const DEFAULT_GROUPS: UserGroup[] = [
  {
    id: 'grp-admin',
    name: 'ผู้ดูแลระบบ',
    description: 'เข้าถึงและจัดการได้ทุกเมนู',
    isSystem: true,
    permissions: {
      map: ALL, dashboard: VIEW, portal: ALL, reports: VIEW,
      adminCameras: ALL, adminUsers: ALL, adminRepairs: ALL, adminGroups: ALL,
    },
  },
  {
    id: 'grp-operator',
    name: 'เจ้าหน้าที่ควบคุม',
    description: 'ใช้งานแผนที่ แดชบอร์ด รายงาน และจัดการข้อมูลกล้อง',
    isSystem: true,
    permissions: {
      map: ALL, dashboard: VIEW, portal: ALL, reports: VIEW,
      adminCameras: NONE, adminUsers: NONE, adminRepairs: NONE, adminGroups: NONE,
    },
  },
  {
    id: 'grp-executive',
    name: 'ผู้บริหาร',
    description: 'ดูข้อมูลภาพรวมและรายงาน (อ่านอย่างเดียว)',
    isSystem: true,
    permissions: {
      map: VIEW, dashboard: VIEW, portal: VIEW, reports: VIEW,
      adminCameras: NONE, adminUsers: NONE, adminRepairs: NONE, adminGroups: NONE,
    },
  },
  {
    id: 'grp-citizen',
    name: 'ประชาชน',
    description: 'ยื่นและติดตามคำขอข้อมูลภาพจากกล้อง CCTV',
    isSystem: true,
    permissions: {
      map: NONE, dashboard: NONE, portal: ALL, reports: NONE,
      adminCameras: NONE, adminUsers: NONE, adminRepairs: NONE, adminGroups: NONE,
    },
  },
];

const ROLE_GROUP: Record<UserRole, string> = {
  admin: 'grp-admin',
  operator: 'grp-operator',
  executive: 'grp-executive',
  citizen: 'grp-citizen',
};

export function savedGroups(): UserGroup[] {
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    if (!raw) return DEFAULT_GROUPS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_GROUPS;
  } catch {
    return DEFAULT_GROUPS;
  }
}

export function saveGroup(group: UserGroup): void {
  const others = savedGroups().filter(g => g.id !== group.id);
  const groups = savedGroups().some(g => g.id === group.id)
    ? savedGroups().map(g => (g.id === group.id ? group : g)) // keep position
    : [...others, group];
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

/* System groups cannot be deleted — returns false when refused */
export function deleteGroup(id: string): boolean {
  const groups = savedGroups();
  const target = groups.find(g => g.id === id);
  if (!target || target.isSystem) return false;
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups.filter(g => g.id !== id)));
  return true;
}

/* ---------- Explicit user→group assignments (persisted) ---------- */

const ASSIGNMENTS_KEY = 'user_group_assignments';

export function savedAssignments(): Record<string, string> {
  try {
    const raw = localStorage.getItem(ASSIGNMENTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function assignUserToGroup(userId: string, groupId: string): void {
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify({ ...savedAssignments(), [userId]: groupId }));
}

/* Removing an assignment reverts the user to their role's system group */
export function removeAssignment(userId: string): void {
  const assignments = savedAssignments();
  delete assignments[userId];
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
}

/* Resolution order: persisted assignment → session groupId → role's system group */
export function groupForUser(user: Pick<User, 'role' | 'groupId'> & { id?: string }): UserGroup {
  const groups = savedGroups();
  const assignedId = user.id ? savedAssignments()[user.id] : undefined;
  for (const candidate of [assignedId, user.groupId]) {
    if (candidate) {
      const byId = groups.find(g => g.id === candidate);
      if (byId) return byId;
    }
  }
  return groups.find(g => g.id === ROLE_GROUP[user.role])
    ?? DEFAULT_GROUPS.find(g => g.id === ROLE_GROUP[user.role])!;
}

export interface GroupMember {
  user: User;
  /* true = added explicitly (removable), false = member via role default */
  byAssignment: boolean;
}

export function membersOfGroup(groupId: string, users: User[]): GroupMember[] {
  const assignments = savedAssignments();
  return users
    .filter(u => groupForUser(u).id === groupId)
    .map(u => ({ user: u, byAssignment: assignments[u.id] === groupId }));
}

export function hasPermission(group: UserGroup, menu: MenuKey, action: PermissionAction): boolean {
  const actions = group.permissions[menu] ?? [];
  if (action === 'view') return actions.length > 0; // any granted action implies view
  return actions.includes(action);
}
