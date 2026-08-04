import type { ApprovalLevel, RequestStatus } from '../types';
import { savedUsers } from './userStorage';

/* which of the 3 sequential approval levels a request is currently waiting on, or null if it's outside that phase */
export function currentApprovalLevelOf(status: RequestStatus): ApprovalLevel | null {
  if (status === 'รอดำเนินการ') return 1;
  if (status === 'รอหัวหน้างานอนุมัติ') return 2;
  if (status === 'รอผู้บริหารอนุมัติ') return 3;
  return null;
}

export const NEXT_APPROVAL_STATUS: Record<ApprovalLevel, RequestStatus> = {
  1: 'รอหัวหน้างานอนุมัติ',
  2: 'รอผู้บริหารอนุมัติ',
  3: 'อนุมัติ',
};

export const APPROVAL_LEVEL_LABEL: Record<ApprovalLevel, string> = { 1: 'เจ้าหน้าที่ผู้รับเรื่อง', 2: 'หัวหน้างาน', 3: 'ผู้บริหาร' };

const KEY = 'cctv_approver_settings';

export interface CctvApproverSettings {
  level1: string[];
  level2: string[];
  level3: string[];
}

/* Demo defaults so the 3-level approval chain has someone assigned at every
   level out of the box — admins can change these on /admin/cctv-approvers.
   Picked from the seeded staff accounts in src/data/users.json. */
const DEFAULT_SETTINGS: CctvApproverSettings = {
  level1: ['2', '4'],
  level2: ['5', '6'],
  level3: ['3', '10'],
};

function isValid(value: unknown): value is CctvApproverSettings {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.level1) && Array.isArray(v.level2) && Array.isArray(v.level3);
}

export function savedCctvApprovers(): CctvApproverSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return isValid(parsed) ? parsed : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveCctvApprovers(settings: CctvApproverSettings): void {
  localStorage.setItem(KEY, JSON.stringify(settings));
}

export function isApproverAtLevel(userId: string, level: ApprovalLevel): boolean {
  const settings = savedCctvApprovers();
  const list = level === 1 ? settings.level1 : level === 2 ? settings.level2 : settings.level3;
  return list.includes(userId);
}

/* names for display (e.g. "รายชื่อผู้อนุมัติระดับ 2 คนถัดไป") */
export function approverNamesAtLevel(level: ApprovalLevel): { id: string; name: string; email: string }[] {
  const settings = savedCctvApprovers();
  const ids = level === 1 ? settings.level1 : level === 2 ? settings.level2 : settings.level3;
  const users = savedUsers();
  return ids
    .map(id => users.find(u => u.id === id))
    .filter((u): u is NonNullable<typeof u> => Boolean(u))
    .map(u => ({ id: u.id, name: u.name, email: u.email }));
}
