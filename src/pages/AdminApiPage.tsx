import { useState } from 'react';
import { Loader2, Pencil, Plug, PlugZap, Plus, Trash2 } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Modal, ConfirmDialog } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { useAuth } from '../context/AuthContext';
import { API_TYPE_FIELDS, API_TYPE_LABELS, savedConnections, saveConnections } from '../utils/apiConnections';
import type { ApiConnection, ApiType } from '../utils/apiConnections';
import { formatThaiDateTime } from '../utils/formatDate';
import { logAudit } from '../utils/auditLog';

const PAGE_SIZE = 10;

const TYPE_BADGE: Record<ApiType, string> = {
  camera: 'bg-pink-100 text-pink-700 border-pink-300',
  oauth: 'bg-blue-100 text-blue-700 border-blue-300',
  ldap: 'bg-amber-100 text-amber-700 border-amber-300',
  rest: 'bg-teal-100 text-teal-700 border-teal-300',
};

const STATUS_BADGE = {
  connected: { label: 'เชื่อมต่อแล้ว', className: 'bg-green-100 text-green-700' },
  disconnected: { label: 'ยังไม่เชื่อมต่อ', className: 'bg-gray-100 text-gray-600' },
  error: { label: 'ผิดพลาด', className: 'bg-red-100 text-red-700' },
} as const;

const EMPTY_FORM = {
  name: '',
  type: 'rest' as ApiType,
  config: {} as Record<string, string>,
  enabled: true,
};

export function AdminApiPage() {
  const { can, user: currentUser } = useAuth();
  const [connections, setConnectionsState] = useState<ApiConnection[]>(() => savedConnections());
  const [modalOpen, setModalOpen] = useState(false);
  const [editConn, setEditConn] = useState<ApiConnection | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const setConnections = (updater: (prev: ApiConnection[]) => ApiConnection[]) => {
    setConnectionsState(prev => {
      const next = updater(prev);
      saveConnections(next);
      return next;
    });
  };

  const totalPages = Math.max(1, Math.ceil(connections.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = connections.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const openAdd = () => {
    setEditConn(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (conn: ApiConnection) => {
    setEditConn(conn);
    setForm({ name: conn.name, type: conn.type, config: { ...conn.config }, enabled: conn.enabled });
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const fields = API_TYPE_FIELDS[form.type];
    const endpoint = form.config[fields[0].key] ?? '';
    if (editConn) {
      setConnections(prev => prev.map(c => c.id === editConn.id
        ? { ...c, name: form.name, type: form.type, endpoint, config: form.config, enabled: form.enabled }
        : c));
      logAudit(currentUser, 'edit', 'จัดการการเชื่อมต่อ API', `แก้ไขการเชื่อมต่อ: ${form.name}`);
    } else {
      setConnections(prev => [...prev, {
        id: `api-${Date.now()}`,
        name: form.name,
        type: form.type,
        endpoint,
        config: form.config,
        enabled: form.enabled,
        status: 'disconnected',
        lastChecked: new Date().toISOString(),
      }]);
      logAudit(currentUser, 'create', 'จัดการการเชื่อมต่อ API', `เพิ่มการเชื่อมต่อใหม่: ${form.name}`);
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      const target = connections.find(c => c.id === deleteId);
      setConnections(prev => prev.filter(c => c.id !== deleteId));
      logAudit(currentUser, 'delete', 'จัดการการเชื่อมต่อ API', `ลบการเชื่อมต่อ: ${target?.name ?? deleteId}`);
    }
    setDeleteId(null);
  };

  const toggleEnabled = (conn: ApiConnection) => {
    setConnections(prev => prev.map(c => c.id === conn.id ? { ...c, enabled: !c.enabled } : c));
    logAudit(currentUser, 'edit', 'จัดการการเชื่อมต่อ API', `${conn.enabled ? 'ปิด' : 'เปิด'}ใช้งานการเชื่อมต่อ: ${conn.name}`);
  };

  /* mock connectivity test: spin ~1s then mark connected (demo has no backend) */
  const handleTest = (conn: ApiConnection) => {
    if (testingId) return;
    setTestingId(conn.id);
    setTimeout(() => {
      setConnections(prev => prev.map(c => c.id === conn.id
        ? { ...c, status: 'connected', lastChecked: new Date().toISOString() }
        : c));
      setTestingId(null);
    }, 1200);
  };

  const setConfig = (key: string, val: string) =>
    setForm(f => ({ ...f, config: { ...f.config, [key]: val } }));

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Page header banner */}
        <div className="bg-blue-50 border-b-2 border-blue-100 px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-navy-700 rounded-xl flex items-center justify-center">
              <Plug size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-navy-700">จัดการการเชื่อมต่อ API</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-gray-600">Live Camera, Google OAuth 2.0, LDAP และบริการภายนอกอื่น ๆ</span>
                <span className="bg-navy-700 text-white text-sm font-bold px-2.5 py-0.5 rounded-full">{connections.length} รายการ</span>
              </div>
            </div>
          </div>
          {can('adminApi', 'create') && (
            <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl border-2 border-green-400 shadow-lg hover:shadow-xl hover:scale-105 transition-all text-base">
              <Plus size={20} /> เพิ่มการเชื่อมต่อ
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          <div className="card overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-xl">
                <thead>
                  <tr className="bg-blue-200">
                    {['ชื่อการเชื่อมต่อ', 'ประเภท', 'Endpoint', 'สถานะ', 'ตรวจสอบล่าสุด', 'เปิดใช้งาน', 'ดำเนินการ'].map(h => (
                      <th key={h} scope="col" className="text-left text-xl font-bold text-navy-700 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((conn, idx) => {
                    const status = STATUS_BADGE[conn.status];
                    return (
                      <tr key={conn.id} className={`border-b border-blue-100 hover:bg-blue-100 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50'}`}>
                        <td className="px-4 py-2.5 font-bold text-navy-700">{conn.name}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center text-sm font-bold px-2.5 py-1 rounded-lg border ${TYPE_BADGE[conn.type]}`}>
                            {API_TYPE_LABELS[conn.type]}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-sm text-gray-600 break-all">{conn.endpoint}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center text-sm font-bold px-3 py-1 rounded-lg ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-base text-gray-500 whitespace-nowrap">{formatThaiDateTime(conn.lastChecked)}</td>
                        <td className="px-4 py-2.5">
                          {can('adminApi', 'edit') ? (
                            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-lg text-gray-700">
                              <input
                                type="checkbox"
                                checked={conn.enabled}
                                onChange={() => toggleEnabled(conn)}
                                aria-label={`เปิดใช้งาน ${conn.name}`}
                                className="w-5 h-5 rounded border-gray-300 accent-[#1b3a6b] cursor-pointer"
                              />
                              {conn.enabled ? 'เปิด' : 'ปิด'}
                            </label>
                          ) : (
                            <span className="text-lg text-gray-700">{conn.enabled ? 'เปิด' : 'ปิด'}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleTest(conn)}
                              disabled={testingId !== null}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow transition-all"
                              title="ทดสอบการเชื่อมต่อ"
                            >
                              {testingId === conn.id
                                ? <Loader2 size={13} className="animate-spin" />
                                : <PlugZap size={13} />} ทดสอบ
                            </button>
                            {can('adminApi', 'edit') && (
                              <button onClick={() => openEdit(conn)} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow transition-all" title="แก้ไข">
                                <Pencil size={13} /> แก้ไข
                              </button>
                            )}
                            {can('adminApi', 'delete') && (
                              <button onClick={() => setDeleteId(conn.id)} className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow transition-all" title="ลบ">
                                <Trash2 size={13} /> ลบ
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination total={connections.length} page={safePage} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editConn ? `แก้ไข ${editConn.name}` : 'เพิ่มการเชื่อมต่อใหม่'}>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label htmlFor="api-name" className="label">ชื่อการเชื่อมต่อ <span className="text-red-600">*</span></label>
            <input id="api-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" required placeholder="เช่น Google OAuth 2.0" />
          </div>
          <div>
            <label htmlFor="api-type" className="label">ประเภท</label>
            <select
              id="api-type"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as ApiType, config: {} }))}
              className="input-field"
            >
              {Object.entries(API_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          {/* fields change with the selected type */}
          {API_TYPE_FIELDS[form.type].map(field => (
            <div key={field.key}>
              <label htmlFor={`api-${field.key}`} className="label">{field.label}</label>
              <input
                id={`api-${field.key}`}
                type={field.secret ? 'password' : 'text'}
                value={form.config[field.key] ?? ''}
                onChange={e => setConfig(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="input-field font-mono text-base"
              />
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="api-enabled" checked={form.enabled} onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} className="rounded" />
            <label htmlFor="api-enabled" className="text-sm text-gray-700">เปิดใช้งาน</label>
          </div>
          <div className="flex gap-3 justify-end mt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">ยกเลิก</button>
            <button type="submit" className="btn-primary">บันทึก</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="ยืนยันการลบ"
        message="ต้องการลบการเชื่อมต่อนี้ออกจากระบบ?"
        confirmLabel="ลบ"
        danger
      />
    </Layout>
  );
}
