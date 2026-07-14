import { EVENT_COLORS, EVENT_LABELS, EVENT_TEXT_COLORS, type EventType } from '../types';

interface EventBadgeProps {
  type: EventType;
  size?: 'sm' | 'md';
}

export function EventBadge({ type, size = 'md' }: EventBadgeProps) {
  if (type === 'normal') return null;
  const label = EVENT_LABELS[type];
  const cls = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold ${cls}`}
      style={{ backgroundColor: EVENT_COLORS[type] + '22', color: EVENT_TEXT_COLORS[type] }}
    >
      {label}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
}

/* light background + dark text so every badge passes WCAG AA (>= 4.5:1) */
const STATUS_STYLES: Record<string, string> = {
  'Online':       'bg-green-100 text-green-800 border-green-300',
  'Offline':      'bg-gray-200 text-gray-700 border-gray-300',
  'ใหม่':         'bg-emerald-100 text-emerald-800 border-emerald-300',
  'รอดำเนินการ': 'bg-amber-100 text-amber-800 border-amber-300',
  'รอภาพ':        'bg-blue-100 text-blue-800 border-blue-300',
  'อนุมัติ':      'bg-indigo-100 text-indigo-800 border-indigo-300',
  'ส่งแล้ว':      'bg-slate-200 text-slate-700 border-slate-300',
  'ได้รับแล้ว':   'bg-navy-700 text-white border-navy-800',
  'ปฏิเสธ':       'bg-red-100 text-red-800 border-red-300',
  'Active':       'bg-green-100 text-green-800 border-green-300',
  'Inactive':     'bg-gray-200 text-gray-700 border-gray-300',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const cls = STATUS_STYLES[status] ?? 'bg-gray-200 text-gray-700 border-gray-300';
  return (
    <span className={`inline-flex items-center rounded-xl text-sm font-bold px-2.5 py-1.5 border-2 shadow-sm ${cls}`}>
      {status}
    </span>
  );
}

interface RoleBadgeProps {
  role: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'ผู้ดูแลระบบ',
  operator: 'เจ้าหน้าที่',
  executive: 'ผู้บริหาร',
  citizen: 'ประชาชน',
};

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  operator: 'bg-blue-100 text-blue-700',
  executive: 'bg-amber-100 text-amber-700',
  citizen: 'bg-green-100 text-green-700',
};

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full text-sm font-medium px-2.5 py-1 ${ROLE_STYLES[role] ?? 'bg-gray-100 text-gray-600'}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}
