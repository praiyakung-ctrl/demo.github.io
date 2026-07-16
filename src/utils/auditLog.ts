import auditLogData from '../data/auditLog.json';

export type AuditAction = 'login' | 'logout' | 'create' | 'edit' | 'delete' | 'export';

export interface AuditEntry {
  id: string;
  timestamp: string;
  username: string;
  name: string;
  action: AuditAction;
  menu: string;
  detail: string;
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  login: 'เข้าสู่ระบบ',
  logout: 'ออกจากระบบ',
  create: 'เพิ่มข้อมูล',
  edit: 'แก้ไขข้อมูล',
  delete: 'ลบข้อมูล',
  export: 'Export',
};

const LOG_KEY = 'audit_logs';
const MAX_ENTRIES = 500;
const SEED = auditLogData as AuditEntry[];

export function savedAuditLogs(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED;
  } catch {
    return SEED;
  }
}

/* Append a new entry on top; the log is capped so localStorage stays small */
export function logAudit(
  user: { username: string; name: string } | null,
  action: AuditAction,
  menu: string,
  detail: string
): void {
  const entry: AuditEntry = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    username: user?.username ?? 'unknown',
    name: user?.name ?? 'ไม่ระบุ',
    action,
    menu,
    detail,
  };
  localStorage.setItem(LOG_KEY, JSON.stringify([entry, ...savedAuditLogs()].slice(0, MAX_ENTRIES)));
}
