import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, KeyRound, User as UserIcon, Users } from 'lucide-react';
import { Layout } from '../components/Layout';
import { RoleBadge, StatusBadge } from '../components/Badge';
import { Modal, ConfirmDialog } from '../components/Modal';
import usersData from '../data/users.json';
import type { User } from '../types';
import { useAuth } from '../context/AuthContext';
import { assignUserToGroup, groupForUser, removeAssignment, savedGroups } from '../utils/groupStorage';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'ผู้ดูแลระบบ' },
  { value: 'operator', label: 'เจ้าหน้าที่' },
  { value: 'executive', label: 'ผู้บริหาร' },
];

const EMPTY_FORM = {
  name: '', username: '', email: '', role: 'operator' as 'admin' | 'operator' | 'executive' | 'citizen',
  password: '', isActive: true, groupId: '',
};

export function AdminUsersPage() {
  const { can } = useAuth();
  const groups = savedGroups();
  const [users, setUsers] = useState<User[]>(usersData as User[]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditUser(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setForm({ name: user.name, username: user.username, email: user.email, role: user.role as 'admin' | 'operator' | 'executive' | 'citizen', password: '', isActive: user.isActive, groupId: user.groupId ?? '' });
    setModalOpen(true);
  };

  const handleSave = () => {
    const record = { ...form, groupId: form.groupId || undefined };
    const id = editUser?.id ?? String(Date.now());
    if (editUser) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...record } : u));
    } else {
      setUsers(prev => [...prev, { id, ...record }]);
    }
    // keep the persistent assignment store (shared with /admin/groups) in sync
    if (record.groupId) assignUserToGroup(id, record.groupId); else removeAssignment(id);
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) setUsers(prev => prev.filter(u => u.id !== deleteId));
    setDeleteId(null);
  };

  const set = (key: string, val: string | boolean) => setForm(f => ({ ...f, [key]: val }));

  return (
    <Layout>
      <div className="flex flex-col h-full">

        {/* Page header banner */}
        <div className="bg-navy-700 px-6 py-4 flex items-center justify-between shadow-md flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Users size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">จัดการผู้ใช้งาน</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-navy-200">ผู้ใช้ในระบบทั้งหมด</span>
                <span className="bg-white/25 text-white text-sm font-bold px-2.5 py-0.5 rounded-full">{users.length} คน</span>
              </div>
            </div>
          </div>
          {can('adminUsers', 'create') && (
            <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl border-2 border-green-400 shadow-lg hover:shadow-xl hover:scale-105 transition-all text-base">
              <Plus size={20} /> เพิ่มผู้ใช้
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          <div className="card overflow-hidden shadow-md">

            {/* Search */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 border-b border-gray-200">
              <div className="relative flex-1 max-w-sm">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ค้นหาชื่อ, Username, หรืออีเมล..."
                  aria-label="ค้นหาชื่อ Username หรืออีเมล"
                  className="w-full pl-9 pr-3 py-2 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:border-navy-400 bg-white"
                />
              </div>
              <span className="text-base text-navy-700 font-bold flex-shrink-0">
                พบ {filtered.length} / {users.length} รายการ
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-navy-700">
                    {['ชื่อ-นามสกุล', 'Username', 'อีเมล', 'บทบาท', 'กลุ่มสิทธิ์', 'สถานะ', 'ดำเนินการ'].map(h => (
                      <th key={h} scope="col" className="text-left text-base font-bold text-white px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user, idx) => (
                    <tr key={user.id} className={`border-b border-blue-100 hover:bg-blue-100 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50'}`}>
                      {/* Name with User icon */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-navy-100 border-2 border-navy-300 flex items-center justify-center flex-shrink-0">
                            <UserIcon size={20} className="text-navy-700" />
                          </div>
                          <span className="font-bold text-navy-700 text-base">{user.name}</span>
                        </div>
                      </td>
                      {/* Username */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-bold text-navy-700">{user.username}</span>
                      </td>
                      {/* Email */}
                      <td className="px-4 py-3 text-lg text-navy-700">{user.email}</td>
                      {/* Role */}
                      <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                      {/* Permission group */}
                      <td className="px-4 py-3 text-base text-navy-700">{groupForUser(user).name}</td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={user.isActive ? 'Active' : 'Inactive'} />
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {can('adminUsers', 'edit') && (
                            <button onClick={() => openEdit(user)} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow transition-all" title="แก้ไข">
                              <Pencil size={13} /> แก้ไข
                            </button>
                          )}
                          {can('adminUsers', 'edit') && (
                            <button onClick={() => setResetId(user.id)} className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow transition-all" title="Reset รหัสผ่าน">
                              <KeyRound size={13} /> Reset
                            </button>
                          )}
                          {can('adminUsers', 'delete') && (
                            <button onClick={() => setDeleteId(user.id)} className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow transition-all" title="ลบ">
                              <Trash2 size={13} /> ลบ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editUser ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}>
        <div className="space-y-3">
          <div>
            <label htmlFor="user-name" className="label">ชื่อ-นามสกุล *</label>
            <input id="user-name" value={form.name} onChange={e => set('name', e.target.value)} className="input-field" />
          </div>
          <div>
            <label htmlFor="user-username" className="label">Username *</label>
            <input id="user-username" value={form.username} onChange={e => set('username', e.target.value)} className="input-field" />
          </div>
          <div>
            <label htmlFor="user-email" className="label">อีเมล</label>
            <input id="user-email" type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input-field" />
          </div>
          <div>
            <label htmlFor="user-role" className="label">บทบาท</label>
            <select id="user-role" value={form.role} onChange={e => set('role', e.target.value)} className="input-field">
              {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="user-group" className="label">กลุ่มสิทธิ์การใช้งาน</label>
            <select id="user-group" value={form.groupId} onChange={e => set('groupId', e.target.value)} className="input-field">
              <option value="">ตามบทบาท (ค่าเริ่มต้น)</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          {!editUser && (
            <div>
              <label htmlFor="user-password" className="label">รหัสผ่าน *</label>
              <input id="user-password" type="password" value={form.password} onChange={e => set('password', e.target.value)} className="input-field" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="rounded" />
            <label htmlFor="isActive" className="text-sm text-gray-700">เปิดใช้งาน (Active)</label>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-4">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">ยกเลิก</button>
          <button onClick={handleSave} className="btn-primary">บันทึก</button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="ยืนยันการลบผู้ใช้"
        message="ต้องการลบผู้ใช้นี้ออกจากระบบ?"
        confirmLabel="ลบ"
        danger
      />

      <ConfirmDialog
        isOpen={!!resetId}
        onClose={() => setResetId(null)}
        onConfirm={() => { alert(`Reset รหัสผ่านสำเร็จ ระบบส่งอีเมลแล้ว`); setResetId(null); }}
        title="Reset รหัสผ่าน"
        message="ต้องการ reset รหัสผ่านผู้ใช้นี้? ระบบจะส่งรหัสผ่านใหม่ทางอีเมล"
        confirmLabel="Reset"
      />
    </Layout>
  );
}
