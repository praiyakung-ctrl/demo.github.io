import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, BellRing, CheckCircle2, History, Mail, MessageSquare, Pencil, Plus, RotateCcw, Search, Send, Trash2, User as UserIcon, Users } from 'lucide-react';
import { Layout } from '../components/Layout';
import { ConfirmDialog, Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { ExportButtons } from '../components/ExportButtons';
import { EventBadge } from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import { logAudit } from '../utils/auditLog';
import { savedGroups } from '../utils/groupStorage';
import { savedUsers } from '../utils/userStorage';
import { formatThaiDateTime } from '../utils/formatDate';
import { exportElementToPdf, exportRowsToExcel, todayStamp } from '../utils/exportReport';
import { EVENT_LABELS } from '../types';
import {
  CHANNEL_KEYS, CHANNEL_LABELS, DEFAULT_NOTIFICATION_SETTINGS, NOTIFIABLE_EVENT_TYPES, SEVERITY_LABELS,
  savedNotificationLog, savedNotificationSettings, savedRecipients, saveNotificationSettings, saveRecipients, resetNotificationSettings,
} from '../utils/notificationSettings';
import type {
  ChannelKey, NotifiableEventType, NotificationRecipient, NotificationSettings, SeverityLevel,
} from '../utils/notificationSettings';

const PAGE_SIZE = 10;

type Tab = 'events' | 'channels' | 'recipients' | 'history';

const TABS: { key: Tab; label: string; icon: typeof BellRing }[] = [
  { key: 'events', label: 'ตั้งค่าตามประเภทเหตุการณ์', icon: AlertTriangle },
  { key: 'channels', label: 'ช่องทางการแจ้งเตือน', icon: Send },
  { key: 'recipients', label: 'ผู้รับการแจ้งเตือน', icon: Users },
  { key: 'history', label: 'ประวัติการแจ้งเตือน', icon: History },
];

const SEVERITY_BADGE: Record<SeverityLevel, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-600',
};

const MENU_NAME = 'จัดการการแจ้งเตือน';

/* toggle a value in an array (checkbox groups) */
function toggleIn<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value];
}

export function AdminNotificationsPage() {
  const { can, user: currentUser } = useAuth();
  const readOnly = !can('adminNotifications', 'edit');
  const canDelete = can('adminNotifications', 'delete');

  const [tab, setTab] = useState<Tab>('events');

  /* ----- settings (tabs 1–2 share one save) ----- */
  const [settings, setSettings] = useState<NotificationSettings>(() => savedNotificationSettings());
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const setEventRule = (type: NotifiableEventType, patch: Partial<NotificationSettings['events'][NotifiableEventType]>) => {
    setSaved(false);
    setSettings(s => ({ ...s, events: { ...s.events, [type]: { ...s.events[type], ...patch } } }));
  };
  const setChannel = <K extends ChannelKey>(key: K, patch: Partial<NotificationSettings['channels'][K]>) => {
    setSaved(false);
    setSettings(s => ({ ...s, channels: { ...s.channels, [key]: { ...s.channels[key], ...patch } } }));
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveNotificationSettings(settings);
    logAudit(currentUser, 'edit', MENU_NAME, 'บันทึกการตั้งค่าการแจ้งเตือน');
    setSaved(true);
  };

  const handleReset = () => {
    resetNotificationSettings();
    setSettings(DEFAULT_NOTIFICATION_SETTINGS);
    logAudit(currentUser, 'edit', MENU_NAME, 'คืนค่าการตั้งค่าการแจ้งเตือนเป็นค่าเริ่มต้น');
    setSaved(false);
  };

  /* ----- recipients ----- */
  const [recipients, setRecipients] = useState<NotificationRecipient[]>(() => savedRecipients());
  const [recipientPage, setRecipientPage] = useState(1);
  const [editing, setEditing] = useState<NotificationRecipient | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<NotificationRecipient | null>(null);

  const groups = useMemo(() => savedGroups(), []);
  const users = useMemo(() => savedUsers().filter(u => u.isActive), []);

  const targetName = (r: NotificationRecipient) =>
    r.targetType === 'group'
      ? groups.find(g => g.id === r.targetId)?.name ?? 'ไม่พบกลุ่ม'
      : users.find(u => u.id === r.targetId)?.name ?? 'ไม่พบผู้ใช้';

  const persistRecipients = (next: NotificationRecipient[]) => {
    setRecipients(next);
    saveRecipients(next);
  };

  const handleSaveRecipient = (rec: NotificationRecipient) => {
    const exists = recipients.some(r => r.id === rec.id);
    persistRecipients(exists ? recipients.map(r => (r.id === rec.id ? rec : r)) : [...recipients, rec]);
    logAudit(currentUser, exists ? 'edit' : 'create', MENU_NAME, `${exists ? 'แก้ไข' : 'เพิ่ม'}ผู้รับการแจ้งเตือน: ${targetName(rec)}`);
    setModalOpen(false);
    setEditing(null);
  };

  const handleDeleteRecipient = (rec: NotificationRecipient) => {
    persistRecipients(recipients.filter(r => r.id !== rec.id));
    logAudit(currentUser, 'delete', MENU_NAME, `ลบผู้รับการแจ้งเตือน: ${targetName(rec)}`);
  };

  const recipientTotalPages = Math.max(1, Math.ceil(recipients.length / PAGE_SIZE));
  const recipientSafePage = Math.min(recipientPage, recipientTotalPages);
  const recipientRows = recipients.slice((recipientSafePage - 1) * PAGE_SIZE, recipientSafePage * PAGE_SIZE);

  /* ----- history ----- */
  const [logs] = useState(() =>
    [...savedNotificationLog()].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  );
  const [search, setSearch] = useState('');
  const [filterEvent, setFilterEvent] = useState('all');
  const [filterChannel, setFilterChannel] = useState('all');
  const [logPage, setLogPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const filteredLogs = logs.filter(log =>
    (log.message.toLowerCase().includes(search.toLowerCase()) ||
      log.recipient.toLowerCase().includes(search.toLowerCase())) &&
    (filterEvent === 'all' || log.eventType === filterEvent) &&
    (filterChannel === 'all' || log.channel === filterChannel)
  );
  const logTotalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const logSafePage = Math.min(logPage, logTotalPages);
  const logRows = filteredLogs.slice((logSafePage - 1) * PAGE_SIZE, logSafePage * PAGE_SIZE);

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (exporting) return;
    setExporting(true);
    try {
      const filename = `ประวัติการแจ้งเตือน-${todayStamp()}`;
      if (format === 'excel') {
        const rows: (string | number)[][] = [
          ['วันเวลา', 'เหตุการณ์', 'ช่องทาง', 'ผู้รับ', 'ข้อความ', 'สถานะ'],
          ...filteredLogs.map(log => [
            formatThaiDateTime(log.timestamp), EVENT_LABELS[log.eventType], CHANNEL_LABELS[log.channel],
            log.recipient, log.message, log.status === 'sent' ? 'ส่งแล้ว' : 'ล้มเหลว',
          ]),
        ];
        await exportRowsToExcel(rows, 'Notification Log', `${filename}.xlsx`);
      } else if (tableRef.current) {
        await exportElementToPdf(tableRef.current, `${filename}.pdf`);
      }
      logAudit(currentUser, 'export', MENU_NAME, `Export ประวัติการแจ้งเตือน (${format.toUpperCase()})`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Page header banner */}
        <div className="bg-blue-50 border-b-2 border-blue-100 px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-navy-700 rounded-xl flex items-center justify-center">
              <BellRing size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-navy-700">จัดการการแจ้งเตือน</h1>
              <p className="text-sm text-gray-600 mt-0.5">ประเภทเหตุการณ์ ช่องทางการส่ง ผู้รับ และประวัติการแจ้งเตือน</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          {/* Tab bar */}
          <div className="flex flex-wrap gap-2 mb-4">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-lg font-bold border-2 transition-colors ${
                  tab === key
                    ? 'bg-navy-700 border-navy-700 text-white'
                    : 'bg-white border-gray-200 text-navy-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={20} /> {label}
              </button>
            ))}
          </div>

          {/* ---------- Tab 1–2: settings form (shared save) ---------- */}
          {(tab === 'events' || tab === 'channels') && (
            <form onSubmit={handleSaveSettings} className="card overflow-hidden shadow-md max-w-4xl">
              <div className="p-4 space-y-4">
                {tab === 'events' && NOTIFIABLE_EVENT_TYPES.map(type => {
                  const rule = settings.events[type];
                  return (
                    <div key={type} className={`rounded-xl border-2 overflow-hidden ${rule.enabled ? 'border-blue-200' : 'border-gray-200 opacity-70'}`}>
                      <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 border-b border-blue-200">
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rule.enabled}
                              onChange={e => setEventRule(type, { enabled: e.target.checked })}
                              disabled={readOnly}
                              className="w-5 h-5 accent-[#1b3a6b]"
                              aria-label={`เปิดการแจ้งเตือน ${EVENT_LABELS[type]}`}
                            />
                            <span className="text-lg font-bold text-navy-700">เปิดใช้งาน</span>
                          </label>
                          <EventBadge type={type} />
                        </div>
                        <span className={`text-sm font-bold px-3 py-1 rounded-lg ${SEVERITY_BADGE[rule.severity]}`}>
                          ความรุนแรง: {SEVERITY_LABELS[rule.severity]}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                        <div>
                          <label htmlFor={`sev-${type}`} className="label">ระดับความรุนแรง</label>
                          <select
                            id={`sev-${type}`}
                            value={rule.severity}
                            onChange={e => setEventRule(type, { severity: e.target.value as SeverityLevel })}
                            disabled={readOnly || !rule.enabled}
                            className="input-field"
                          >
                            {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <span className="label">แจ้งเตือนด่วน</span>
                          <label className="flex items-center gap-2 mt-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rule.urgent}
                              onChange={e => setEventRule(type, { urgent: e.target.checked })}
                              disabled={readOnly || !rule.enabled}
                              className="w-5 h-5 accent-[#1b3a6b]"
                            />
                            <span className="text-lg text-gray-700">ส่งทันทีทุกช่องทาง</span>
                          </label>
                        </div>
                        <div>
                          <span className="label">ช่องทางที่ใช้ส่ง</span>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                            {CHANNEL_KEYS.map(ch => (
                              <label key={ch} className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={rule.channels.includes(ch)}
                                  onChange={() => setEventRule(type, { channels: toggleIn(rule.channels, ch) })}
                                  disabled={readOnly || !rule.enabled}
                                  className="w-5 h-5 accent-[#1b3a6b]"
                                />
                                <span className="text-lg text-gray-700">{CHANNEL_LABELS[ch]}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {tab === 'channels' && (
                  <>
                    {/* Push Notification — ช่องทางเริ่มต้นของระบบ เปิดใช้งานเสมอ */}
                    <div className="rounded-xl border-2 border-indigo-200 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 border-b border-indigo-200">
                        <div className="flex items-center gap-2">
                          <BellRing size={16} className="text-indigo-600" />
                          <span className="text-sm font-bold text-indigo-700">Push Notification (ในระบบ)</span>
                        </div>
                        <span className="text-sm font-bold text-indigo-700 bg-indigo-100 px-3 py-1 rounded-lg">
                          ค่าเริ่มต้นของระบบ · เปิดใช้งานเสมอ
                        </span>
                      </div>
                      <div className="p-4">
                        <p className="text-lg text-gray-600">
                          แจ้งเตือนผ่านกระดิ่งบนหน้าจอของผู้ใช้งานที่ล็อกอินอยู่ในระบบโดยอัตโนมัติ ไม่ต้องตั้งค่าเพิ่มเติม
                        </p>
                      </div>
                    </div>

                    {/* LINE */}
                    <div className="rounded-xl border-2 border-green-200 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-green-50 border-b border-green-200">
                        <div className="flex items-center gap-2">
                          <MessageSquare size={16} className="text-green-600" />
                          <span className="text-sm font-bold text-green-700">LINE Official</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.channels.line.enabled}
                            onChange={e => setChannel('line', { enabled: e.target.checked })}
                            disabled={readOnly}
                            className="w-5 h-5 accent-[#1b3a6b]"
                          />
                          <span className="text-sm font-bold text-green-700">เปิดใช้งาน</span>
                        </label>
                      </div>
                      <div className="p-4">
                        <label htmlFor="line-token" className="label">Channel Access Token</label>
                        <input
                          id="line-token"
                          type="password"
                          value={settings.channels.line.token}
                          onChange={e => setChannel('line', { token: e.target.value })}
                          disabled={readOnly || !settings.channels.line.enabled}
                          placeholder="วาง Token จาก LINE Developers Console"
                          className="input-field"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="rounded-xl border-2 border-blue-200 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 border-b border-blue-200">
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-blue-600" />
                          <span className="text-sm font-bold text-blue-700">Email (SMTP)</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.channels.email.enabled}
                            onChange={e => setChannel('email', { enabled: e.target.checked })}
                            disabled={readOnly}
                            className="w-5 h-5 accent-[#1b3a6b]"
                          />
                          <span className="text-sm font-bold text-blue-700">เปิดใช้งาน</span>
                        </label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4">
                        <div>
                          <label htmlFor="smtp-host" className="label">SMTP Host</label>
                          <input
                            id="smtp-host"
                            value={settings.channels.email.smtpHost}
                            onChange={e => setChannel('email', { smtpHost: e.target.value })}
                            disabled={readOnly || !settings.channels.email.enabled}
                            placeholder="smtp.example.go.th"
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label htmlFor="smtp-port" className="label">Port</label>
                          <input
                            id="smtp-port"
                            value={settings.channels.email.smtpPort}
                            onChange={e => setChannel('email', { smtpPort: e.target.value })}
                            disabled={readOnly || !settings.channels.email.enabled}
                            placeholder="587"
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label htmlFor="smtp-sender" className="label">อีเมลผู้ส่ง</label>
                          <input
                            id="smtp-sender"
                            value={settings.channels.email.sender}
                            onChange={e => setChannel('email', { sender: e.target.value })}
                            disabled={readOnly || !settings.channels.email.enabled}
                            placeholder="cctv-alert@chonburi.go.th"
                            className="input-field"
                          />
                        </div>
                      </div>
                    </div>

                  </>
                )}
              </div>

              {/* Footer actions */}
              {!readOnly && (
                <div className="flex items-center justify-between gap-3 p-4 bg-gray-50 border-t border-gray-100">
                  <button type="button" onClick={() => setConfirmReset(true)} className="btn-secondary text-lg flex items-center gap-2">
                    <RotateCcw size={16} /> คืนค่าเริ่มต้น
                  </button>
                  <div className="flex items-center gap-3">
                    {saved && (
                      <span role="status" className="flex items-center gap-1.5 text-lg font-bold text-green-700">
                        <CheckCircle2 size={18} /> บันทึกแล้ว
                      </span>
                    )}
                    <button type="submit" className="btn-primary text-lg">บันทึกการตั้งค่า</button>
                  </div>
                </div>
              )}
            </form>
          )}

          {/* ---------- Tab 3: recipients CRUD ---------- */}
          {tab === 'recipients' && (
            <div className="card overflow-hidden shadow-md">
              <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 border-b border-gray-200">
                <span className="text-base text-navy-700 font-bold">ผู้รับการแจ้งเตือนทั้งหมด {recipients.length} รายการ</span>
                {!readOnly && (
                  <button
                    onClick={() => { setEditing(null); setModalOpen(true); }}
                    className="btn-primary text-lg flex items-center gap-2 ml-auto"
                  >
                    <Plus size={18} /> เพิ่มผู้รับ
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xl">
                  <thead>
                    <tr className="bg-blue-200">
                      {['ประเภท', 'ชื่อผู้รับ', 'ช่องทาง', 'เหตุการณ์ที่รับแจ้ง', 'เปิดใช้งาน', 'จัดการ'].map(h => (
                        <th key={h} scope="col" className="text-left text-xl font-bold text-navy-700 px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recipientRows.map((rec, idx) => (
                      <tr key={rec.id} className={`border-b border-blue-100 hover:bg-blue-100 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50'}`}>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-lg ${
                            rec.targetType === 'group' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'
                          }`}>
                            {rec.targetType === 'group' ? <Users size={14} /> : <UserIcon size={14} />}
                            {rec.targetType === 'group' ? 'กลุ่ม' : 'รายบุคคล'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-bold text-navy-700">{targetName(rec)}</td>
                        <td className="px-4 py-2.5 text-gray-700 text-lg">
                          {rec.channels.map(ch => CHANNEL_LABELS[ch]).join(', ') || '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {rec.eventTypes.map(t => <EventBadge key={t} type={t} size="sm" />)}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="checkbox"
                            checked={rec.enabled}
                            onChange={e => {
                              const next = recipients.map(r => (r.id === rec.id ? { ...r, enabled: e.target.checked } : r));
                              persistRecipients(next);
                              logAudit(currentUser, 'edit', MENU_NAME, `${e.target.checked ? 'เปิด' : 'ปิด'}การแจ้งเตือนผู้รับ: ${targetName(rec)}`);
                            }}
                            disabled={readOnly}
                            className="w-5 h-5 accent-[#1b3a6b]"
                            aria-label={`เปิดใช้งานผู้รับ ${targetName(rec)}`}
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            {!readOnly && (
                              <button
                                onClick={() => { setEditing(rec); setModalOpen(true); }}
                                aria-label={`แก้ไขผู้รับ ${targetName(rec)}`}
                                className="p-2 rounded-lg text-navy-700 hover:bg-navy-50 transition-colors"
                              >
                                <Pencil size={18} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => setDeleting(rec)}
                                aria-label={`ลบผู้รับ ${targetName(rec)}`}
                                className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {recipientRows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-lg">ยังไม่มีผู้รับการแจ้งเตือน</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination total={recipients.length} page={recipientSafePage} pageSize={PAGE_SIZE} onPageChange={setRecipientPage} />
            </div>
          )}

          {/* ---------- Tab 4: history ---------- */}
          {tab === 'history' && (
            <div ref={tableRef} className="card overflow-hidden shadow-md">
              <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 border-b border-gray-200">
                <div className="relative flex-1 min-w-[220px] max-w-sm">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                  <input
                    value={search}
                    onChange={e => { setSearch(e.target.value); setLogPage(1); }}
                    placeholder="ค้นหาข้อความหรือผู้รับ..."
                    aria-label="ค้นหาข้อความหรือผู้รับ"
                    className="w-full pl-9 pr-3 py-2 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:border-navy-400 bg-white"
                  />
                </div>
                <select
                  aria-label="กรองตามประเภทเหตุการณ์"
                  value={filterEvent}
                  onChange={e => { setFilterEvent(e.target.value); setLogPage(1); }}
                  className="input-field w-auto py-2 text-base"
                >
                  <option value="all">ทุกเหตุการณ์</option>
                  {NOTIFIABLE_EVENT_TYPES.map(t => (
                    <option key={t} value={t}>{EVENT_LABELS[t]}</option>
                  ))}
                </select>
                <select
                  aria-label="กรองตามช่องทาง"
                  value={filterChannel}
                  onChange={e => { setFilterChannel(e.target.value); setLogPage(1); }}
                  className="input-field w-auto py-2 text-base"
                >
                  <option value="all">ทุกช่องทาง</option>
                  {CHANNEL_KEYS.map(ch => (
                    <option key={ch} value={ch}>{CHANNEL_LABELS[ch]}</option>
                  ))}
                </select>
                <span className="text-base text-navy-700 font-bold flex-shrink-0">
                  พบ {filteredLogs.length} / {logs.length} รายการ
                </span>
                <div className="ml-auto flex-shrink-0">
                  <ExportButtons disabled={exporting} onPdf={() => handleExport('pdf')} onExcel={() => handleExport('excel')} />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xl">
                  <thead>
                    <tr className="bg-blue-200">
                      {['วันเวลา', 'เหตุการณ์', 'ช่องทาง', 'ผู้รับ', 'ข้อความ', 'สถานะ'].map(h => (
                        <th key={h} scope="col" className="text-left text-xl font-bold text-navy-700 px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logRows.map((log, idx) => (
                      <tr key={log.id} className={`border-b border-blue-100 hover:bg-blue-100 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50'}`}>
                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{formatThaiDateTime(log.timestamp)}</td>
                        <td className="px-4 py-2.5"><EventBadge type={log.eventType} /></td>
                        <td className="px-4 py-2.5 text-gray-700">{CHANNEL_LABELS[log.channel]}</td>
                        <td className="px-4 py-2.5 text-gray-700">{log.recipient}</td>
                        <td className="px-4 py-2.5 text-gray-700">{log.message}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center text-sm font-bold px-3 py-1 rounded-lg ${
                            log.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {log.status === 'sent' ? 'ส่งแล้ว' : 'ล้มเหลว'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {logRows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-lg">ไม่พบรายการที่ตรงกับเงื่อนไข</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination total={filteredLogs.length} page={logSafePage} pageSize={PAGE_SIZE} onPageChange={setLogPage} />
            </div>
          )}
        </div>
      </div>

      {/* Recipient add/edit modal */}
      <RecipientModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSaveRecipient}
        editing={editing}
        groups={groups.map(g => ({ id: g.id, name: g.name }))}
        users={users.map(u => ({ id: u.id, name: u.name }))}
      />

      <ConfirmDialog
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => { if (deleting) handleDeleteRecipient(deleting); setDeleting(null); }}
        title="ลบผู้รับการแจ้งเตือน"
        message={`ต้องการลบ "${deleting ? targetName(deleting) : ''}" ออกจากรายชื่อผู้รับการแจ้งเตือนใช่หรือไม่?`}
        confirmLabel="ลบ"
        danger
      />

      <ConfirmDialog
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={handleReset}
        title="คืนค่าเริ่มต้น"
        message="ต้องการคืนการตั้งค่าการแจ้งเตือนทั้งหมดกลับเป็นค่าเริ่มต้นใช่หรือไม่?"
        confirmLabel="คืนค่าเริ่มต้น"
        danger
      />
    </Layout>
  );
}

/* ---------- Add/edit recipient modal ---------- */

interface RecipientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rec: NotificationRecipient) => void;
  editing: NotificationRecipient | null;
  groups: { id: string; name: string }[];
  users: { id: string; name: string }[];
}

const EMPTY_FORM: Omit<NotificationRecipient, 'id'> = {
  enabled: true,
  targetType: 'group',
  targetId: '',
  channels: ['push'],
  eventTypes: [...NOTIFIABLE_EVENT_TYPES],
};

function RecipientModal({ isOpen, onClose, onSave, editing, groups, users }: RecipientModalProps) {
  const [form, setForm] = useState<Omit<NotificationRecipient, 'id'>>(EMPTY_FORM);
  // reset the form whenever the modal opens for a different target
  const [lastKey, setLastKey] = useState<string | null>(null);
  const openKey = isOpen ? (editing?.id ?? 'new') : null;
  if (openKey !== lastKey) {
    setLastKey(openKey);
    if (openKey) setForm(editing ? { ...editing } : EMPTY_FORM);
  }

  if (!isOpen) return null;

  const options = form.targetType === 'group' ? groups : users;
  const valid = form.targetId !== '' && form.channels.length > 0 && form.eventTypes.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSave({ id: editing?.id ?? `nr-${Date.now()}`, ...form });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? 'แก้ไขผู้รับการแจ้งเตือน' : 'เพิ่มผู้รับการแจ้งเตือน'}
      icon={<BellRing size={20} className="text-white" />}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <span className="label">ประเภทผู้รับ</span>
          <div className="flex gap-6 mt-1">
            {([['group', 'กลุ่มผู้ใช้งาน'], ['user', 'รายบุคคล']] as const).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="targetType"
                  checked={form.targetType === value}
                  onChange={() => setForm(f => ({ ...f, targetType: value, targetId: '' }))}
                  className="w-5 h-5 accent-[#1b3a6b]"
                />
                <span className="text-xl text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="recipient-target" className="label">
            {form.targetType === 'group' ? 'เลือกกลุ่ม' : 'เลือกผู้ใช้งาน'}
          </label>
          <select
            id="recipient-target"
            value={form.targetId}
            onChange={e => setForm(f => ({ ...f, targetId: e.target.value }))}
            className="input-field"
            required
          >
            <option value="">— เลือก{form.targetType === 'group' ? 'กลุ่ม' : 'ผู้ใช้งาน'} —</option>
            {options.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        <div>
          <span className="label">ช่องทางที่รับแจ้ง</span>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1">
            {CHANNEL_KEYS.map(ch => (
              <label key={ch} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.channels.includes(ch)}
                  onChange={() => setForm(f => ({ ...f, channels: toggleIn(f.channels, ch) }))}
                  className="w-5 h-5 accent-[#1b3a6b]"
                />
                <span className="text-xl text-gray-700">{CHANNEL_LABELS[ch]}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <span className="label">ประเภทเหตุการณ์ที่รับแจ้ง</span>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1">
            {NOTIFIABLE_EVENT_TYPES.map(t => (
              <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.eventTypes.includes(t)}
                  onChange={() => setForm(f => ({ ...f, eventTypes: toggleIn(f.eventTypes, t) }))}
                  className="w-5 h-5 accent-[#1b3a6b]"
                />
                <span className="text-xl text-gray-700">{EVENT_LABELS[t]}</span>
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
            className="w-5 h-5 accent-[#1b3a6b]"
          />
          <span className="text-xl text-gray-700">เปิดใช้งานทันที</span>
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">ยกเลิก</button>
          <button type="submit" disabled={!valid} className="btn-primary disabled:opacity-50">
            {editing ? 'บันทึกการแก้ไข' : 'เพิ่มผู้รับ'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
