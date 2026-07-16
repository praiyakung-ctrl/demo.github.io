import { useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download, MailCheck, Plus, Pencil, Trash2, Search, KeyRound, User as UserIcon, Users } from 'lucide-react';
import { Layout } from '../components/Layout';
import { RoleBadge, StatusBadge } from '../components/Badge';
import { Modal, ConfirmDialog } from '../components/Modal';
import type { User } from '../types';
import { ROLE_LABELS } from '../types';
import { useAuth } from '../context/AuthContext';
import { assignUserToGroup, groupForUser, removeAssignment, savedGroups } from '../utils/groupStorage';
import { savedUsers, saveUsers } from '../utils/userStorage';
import { exportRowsToExcel, todayStamp } from '../utils/exportReport';

const PAGE_SIZE = 10;

type SortKey = 'name' | 'username' | 'email' | 'role';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'ผู้ดูแลระบบ' },
  { value: 'operator', label: 'เจ้าหน้าที่' },
  { value: 'executive', label: 'ผู้บริหาร' },
];

const EMPTY_FORM = {
  name: '', username: '', email: '', role: 'operator' as 'admin' | 'operator' | 'executive' | 'citizen',
  password: '', isActive: true, groupId: '',
  phone: '', picture: '', department: '', note: '',
};

/* Red asterisk for required fields */
function Req() {
  return <span className="text-red-600" aria-hidden="true"> *</span>;
}

export function AdminUsersPage() {
  const { user: currentUser, can } = useAuth();
  const groups = savedGroups();
  const [users, setUsersState] = useState<User[]>(() => savedUsers());
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetDoneName, setResetDoneName] = useState<string | null>(null);

  // every mutation persists so edits survive refresh (and new users can log in)
  const setUsers = (updater: (prev: User[]) => User[]) => {
    setUsersState(prev => {
      const next = updater(prev);
      saveUsers(next);
      return next;
    });
  };

  /* is this row the account currently logged in? (guard against self-lockout) */
  const isSelf = (u: User) => currentUser !== null && (u.id === currentUser.id || u.username === currentUser.username);

  const filtered = users.filter(u =>
    (u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())) &&
    (filterRole === 'all' || u.role === filterRole) &&
    (filterGroup === 'all' || groupForUser(u).id === filterGroup) &&
    (filterStatus === 'all' || String(u.isActive) === filterStatus)
  );

  const sorted = sortKey === null ? filtered : [...filtered].sort((a, b) => {
    const va = sortKey === 'role' ? ROLE_LABELS[a.role] : a[sortKey];
    const vb = sortKey === 'role' ? ROLE_LABELS[b.role] : b[sortKey];
    return sortAsc ? va.localeCompare(vb, 'th') : vb.localeCompare(va, 'th');
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(a => !a);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const toggleActive = (u: User) => {
    if (isSelf(u)) return;
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, isActive: !x.isActive } : x));
  };

  const handleExport = () => {
    exportRowsToExcel(
      [
        ['ชื่อ-นามสกุล', 'Username', 'อีเมล', 'เบอร์โทรศัพท์', 'แผนก/สังกัด', 'บทบาท', 'กลุ่มสิทธิ์', 'สถานะ'],
        ...sorted.map(u => [
          u.name, u.username, u.email, u.phone ?? '', u.department ?? '',
          ROLE_LABELS[u.role], groupForUser(u).name, u.isActive ? 'Active' : 'Inactive',
        ]),
      ],
      'ผู้ใช้งาน',
      `รายชื่อผู้ใช้งาน-${todayStamp()}.xlsx`
    );
  };

  const openAdd = () => {
    setEditUser(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setForm({
      name: user.name, username: user.username, email: user.email,
      role: user.role as 'admin' | 'operator' | 'executive' | 'citizen',
      password: '', isActive: user.isActive, groupId: user.groupId ?? '',
      phone: user.phone ?? '', picture: user.picture ?? '',
      department: user.department ?? '', note: user.note ?? '',
    });
    setModalOpen(true);
  };

  const handlePhoto = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set('picture', reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const record = {
      ...form,
      groupId: form.groupId || undefined,
      phone: form.phone || undefined,
      picture: form.picture || undefined,
      department: form.department || undefined,
      note: form.note || undefined,
    };
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
        <div className="bg-blue-50 border-b-2 border-blue-100 px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-navy-700 rounded-xl flex items-center justify-center">
              <Users size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-navy-700">จัดการผู้ใช้งาน</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-gray-600">ผู้ใช้ในระบบทั้งหมด</span>
                <span className="bg-navy-700 text-white text-sm font-bold px-2.5 py-0.5 rounded-full">{users.length} คน</span>
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

            {/* Search + filters */}
            <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 border-b border-gray-200">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="ค้นหาชื่อ, Username, หรืออีเมล..."
                  aria-label="ค้นหาชื่อ Username หรืออีเมล"
                  className="w-full pl-9 pr-3 py-2 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:border-navy-400 bg-white"
                />
              </div>
              <select aria-label="กรองตามบทบาท" value={filterRole} onChange={e => { setFilterRole(e.target.value); setPage(1); }} className="input-field w-auto py-2 text-base">
                <option value="all">ทุกบทบาท</option>
                {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select aria-label="กรองตามกลุ่มสิทธิ์" value={filterGroup} onChange={e => { setFilterGroup(e.target.value); setPage(1); }} className="input-field w-auto py-2 text-base">
                <option value="all">ทุกกลุ่มสิทธิ์</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <select aria-label="กรองตามสถานะ" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="input-field w-auto py-2 text-base">
                <option value="all">ทุกสถานะ</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
              <span className="text-base text-navy-700 font-bold flex-shrink-0">
                พบ {sorted.length} / {users.length} รายการ
              </span>
              <button onClick={handleExport} className="ml-auto flex items-center gap-2 text-base font-bold px-4 py-2 rounded-xl bg-emerald-500 text-white border-2 border-emerald-600 shadow hover:bg-emerald-600 transition-all flex-shrink-0">
                <Download size={16} /> Excel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-blue-200">
                    {([
                      ['ชื่อ-นามสกุล', 'name'], ['Username', 'username'], ['อีเมล', 'email'], ['บทบาท', 'role'],
                    ] as [string, SortKey][]).map(([h, key]) => (
                      <th key={h} scope="col" className="text-left text-base font-bold text-navy-700 px-4 py-3">
                        <button onClick={() => toggleSort(key)} className="flex items-center gap-1.5 hover:text-blue-700 transition-colors">
                          {h}
                          {sortKey === key
                            ? (sortAsc ? <ArrowUp size={14} /> : <ArrowDown size={14} />)
                            : <ArrowUpDown size={14} className="opacity-50" />}
                        </button>
                      </th>
                    ))}
                    {['กลุ่มสิทธิ์', 'สถานะ', 'ดำเนินการ'].map(h => (
                      <th key={h} scope="col" className="text-left text-base font-bold text-navy-700 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((user, idx) => (
                    <tr key={user.id} className={`border-b border-blue-100 hover:bg-blue-100 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50'}`}>
                      {/* Name with User icon */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {user.picture ? (
                            <img src={user.picture} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-navy-300 flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-navy-100 border-2 border-navy-300 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                              <UserIcon size={20} className="text-navy-700" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-navy-700 text-base">{user.name}</p>
                            {user.department && <p className="text-xs text-gray-500 truncate max-w-[220px]">{user.department}</p>}
                          </div>
                        </div>
                      </td>
                      {/* Username */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-bold text-navy-700">{user.username}</span>
                      </td>
                      {/* Email + phone */}
                      <td className="px-4 py-3">
                        <p className="text-lg text-navy-700">{user.email}</p>
                        {user.phone && <p className="text-sm text-gray-500">โทร {user.phone}</p>}
                      </td>
                      {/* Role */}
                      <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                      {/* Permission group */}
                      <td className="px-4 py-3 text-base text-navy-700">{groupForUser(user).name}</td>
                      {/* Status — click to toggle (except your own account) */}
                      <td className="px-4 py-3">
                        {isSelf(user) ? (
                          <StatusBadge status={user.isActive ? 'Active' : 'Inactive'} />
                        ) : (
                          <button
                            onClick={() => toggleActive(user)}
                            title={user.isActive ? 'คลิกเพื่อปิดใช้งาน' : 'คลิกเพื่อเปิดใช้งาน'}
                            aria-label={`${user.isActive ? 'ปิด' : 'เปิด'}ใช้งาน ${user.name}`}
                            className="hover:scale-105 transition-transform"
                          >
                            <StatusBadge status={user.isActive ? 'Active' : 'Inactive'} />
                          </button>
                        )}
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
                          {can('adminUsers', 'delete') && !isSelf(user) && (
                            <button onClick={() => setDeleteId(user.id)} className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow transition-all" title="ลบ">
                              <Trash2 size={13} /> ลบ
                            </button>
                          )}
                          {isSelf(user) && (
                            <span className="text-xs text-gray-400 self-center px-1" title="ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่ได้">บัญชีของคุณ</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {sorted.length > PAGE_SIZE && (
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                <span className="text-base text-gray-600">
                  แสดง {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sorted.length)} จาก {sorted.length} รายการ
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    aria-label="หน้าก่อนหน้า"
                    className="p-2 rounded-lg text-navy-700 hover:bg-navy-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      aria-label={`หน้า ${n}`}
                      aria-current={n === safePage ? 'page' : undefined}
                      className={`min-w-[36px] px-2 py-1.5 rounded-lg text-base font-bold transition-colors ${
                        n === safePage ? 'bg-navy-700 text-white' : 'text-navy-700 hover:bg-navy-50'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    aria-label="หน้าถัดไป"
                    className="p-2 rounded-lg text-navy-700 hover:bg-navy-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editUser ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}>
        <form onSubmit={handleSave} className="space-y-3">
          {/* Profile photo */}
          <div>
            <span className="label">รูปภาพสมาชิก</span>
            <div className="flex items-center gap-3">
              {form.picture ? (
                <img src={form.picture} alt="รูปภาพสมาชิก" className="w-16 h-16 rounded-full object-cover border-2 border-navy-200 flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-navy-100 border-2 border-navy-300 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                  <UserIcon size={28} className="text-navy-700" />
                </div>
              )}
              <div className="flex-1 space-y-1.5">
                <input
                  id="user-photo"
                  type="file"
                  accept="image/*"
                  aria-label="เลือกรูปภาพสมาชิก"
                  onChange={e => handlePhoto(e.target.files?.[0])}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-navy-700 file:text-white file:text-sm file:font-bold file:cursor-pointer hover:file:bg-navy-600"
                />
                {form.picture && (
                  <button type="button" onClick={() => set('picture', '')} className="text-sm text-red-600 hover:underline font-medium">
                    นำรูปออก
                  </button>
                )}
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="user-name" className="label">ชื่อ-นามสกุล<Req /></label>
            <input id="user-name" value={form.name} onChange={e => set('name', e.target.value)} className="input-field" required />
          </div>
          <div>
            <label htmlFor="user-username" className="label">Username<Req /></label>
            <input id="user-username" value={form.username} onChange={e => set('username', e.target.value)} className="input-field" required />
          </div>
          <div>
            <label htmlFor="user-email" className="label">อีเมล</label>
            <input
              id="user-email"
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              pattern="[^@\s]+@[^@\s]+\.[^@\s]+"
              title="รูปแบบอีเมลไม่ถูกต้อง เช่น name@example.com"
              placeholder="เช่น somchai@chonburi.go.th"
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="user-phone" className="label">เบอร์โทรศัพท์</label>
            <input
              id="user-phone"
              type="tel"
              inputMode="numeric"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              pattern="0[0-9]{8,9}"
              title="เบอร์โทร 9-10 หลัก ขึ้นต้นด้วย 0 เช่น 0812345678"
              placeholder="เช่น 0812345678"
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="user-department" className="label">แผนก/หน่วยงาน/สังกัด</label>
            <input
              id="user-department"
              value={form.department}
              onChange={e => set('department', e.target.value)}
              placeholder="เช่น กองสาธารณสุขและสิ่งแวดล้อม อบจ.ชลบุรี"
              className="input-field"
            />
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
              <label htmlFor="user-password" className="label">รหัสผ่าน<Req /></label>
              <input id="user-password" type="password" value={form.password} onChange={e => set('password', e.target.value)} className="input-field" required />
            </div>
          )}
          <div>
            <label htmlFor="user-note" className="label">หมายเหตุ</label>
            <textarea
              id="user-note"
              value={form.note}
              onChange={e => set('note', e.target.value)}
              rows={2}
              placeholder="ข้อมูลเพิ่มเติมเกี่ยวกับผู้ใช้ (ถ้ามี)"
              className="input-field"
            />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="rounded" />
            <label htmlFor="isActive" className="text-sm text-gray-700">เปิดใช้งาน (Active)</label>
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
        title="ยืนยันการลบผู้ใช้"
        message="ต้องการลบผู้ใช้นี้ออกจากระบบ?"
        confirmLabel="ลบ"
        danger
      />

      <ConfirmDialog
        isOpen={!!resetId}
        onClose={() => setResetId(null)}
        onConfirm={() => {
          setResetDoneName(users.find(u => u.id === resetId)?.name ?? '');
          setResetId(null);
        }}
        title="Reset รหัสผ่าน"
        message="ต้องการ reset รหัสผ่านผู้ใช้นี้? ระบบจะส่งรหัสผ่านใหม่ทางอีเมล"
        confirmLabel="Reset"
      />

      {/* Reset success */}
      <Modal
        isOpen={resetDoneName !== null}
        onClose={() => setResetDoneName(null)}
        title="Reset รหัสผ่านสำเร็จ"
        size="sm"
        icon={<KeyRound size={20} className="text-white" />}
      >
        <div className="text-center py-2">
          <MailCheck size={48} className="text-green-600 mx-auto mb-3" aria-hidden="true" />
          <p className="text-xl font-semibold text-gray-900 mb-1">ส่งรหัสผ่านใหม่เรียบร้อยแล้ว</p>
          <p className="text-lg text-gray-600 mb-5">
            ระบบส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมลของ <span className="font-medium text-gray-900">{resetDoneName}</span> แล้ว
          </p>
          <button onClick={() => setResetDoneName(null)} className="btn-primary w-full py-2.5 text-lg">ปิด</button>
        </div>
      </Modal>
    </Layout>
  );
}
