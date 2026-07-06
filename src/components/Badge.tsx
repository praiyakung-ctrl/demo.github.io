import { EVENT_COLORS, EVENT_LABELS, type EventType } from '../types';

interface EventBadgeProps {
  type: EventType;
  size?: 'sm' | 'md';
}

export function EventBadge({ type, size = 'md' }: EventBadgeProps) {
  if (type === 'normal') return null;
  const color = EVENT_COLORS[type];
  const label = EVENT_LABELS[type];
  const cls = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium text-white ${cls}`}
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  'Online':       'bg-green-500 text-white border-green-600',
  'Offline':      'bg-gray-400 text-white border-gray-500',
  'ใหม่':         'bg-emerald-500 text-white border-emerald-600',
  'รอดำเนินการ': 'bg-amber-400 text-white border-amber-500',
  'รอภาพ':        'bg-blue-500 text-white border-blue-600',
  'อนุมัติ':      'bg-indigo-500 text-white border-indigo-600',
  'ส่งแล้ว':      'bg-slate-500 text-white border-slate-600',
  'ได้รับแล้ว':   'bg-navy-700 text-white border-navy-800',
  'ปฏิเสธ':       'bg-red-500 text-white border-red-600',
  'Active':       'bg-green-500 text-white border-green-600',
  'Inactive':     'bg-gray-400 text-white border-gray-500',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const cls = STATUS_STYLES[status] ?? 'bg-gray-400 text-white border-gray-500';
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
