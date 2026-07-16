import { useState } from 'react';
import { Lock, Pencil, Plus, ShieldCheck, Trash2, User as UserIcon, UserMinus, Users } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Modal, ConfirmDialog } from '../components/Modal';
import { RoleBadge } from '../components/Badge';
import {
  assignUserToGroup, deleteGroup, membersOfGroup, removeAssignment, saveGroup, savedGroups,
} from '../utils/groupStorage';
import usersData from '../data/users.json';
import { ACTION_OPTIONS, MENU_OPTIONS } from '../types';
import type { MenuKey, PermissionAction, User, UserGroup } from '../types';

const allUsers = usersData as User[];

const EMPTY_PERMISSIONS: Record<MenuKey, PermissionAction[]> = {
  map: [], dashboard: [], portal: [], reports: [],
  adminCameras: [], adminUsers: [], adminRepairs: [], adminGroups: [],
};

export function AdminGroupsPage() {
  const [groups, setGroups] = useState<UserGroup[]>(() => savedGroups());
  const [editing, setEditing] = useState<UserGroup | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [membersGroup, setMembersGroup] = useState<UserGroup | null>(null);
  const [addUserId, setAddUserId] = useState('');
  const [removeUserId, setRemoveUserId] = useState<string | null>(null);
  // bump to recompute member lists after add/remove
  const [membersVersion, setMembersVersion] = useState(0);

  const openAdd = () => {
    setIsNew(true);
    setEditing({
      id: `grp-${Date.now()}`,
      name: '',
      description: '',
      isSystem: false,
      permissions: { ...EMPTY_PERMISSIONS },
    });
  };

  const openEdit = (group: UserGroup) => {
    setIsNew(false);
    // deep-copy permissions so checkbox edits don't mutate table state
    setEditing({ ...group, permissions: Object.fromEntries(
      MENU_OPTIONS.map(m => [m.key, [...(group.permissions[m.key] ?? [])]])
    ) as Record<MenuKey, PermissionAction[]> });
  };

  const toggle = (menu: MenuKey, action: PermissionAction) => {
    setEditing(g => {
      if (!g) return g;
      const current = new Set(g.permissions[menu] ?? []);
      if (current.has(action)) {
        current.delete(action);
        if (action === 'view') current.clear(); // removing view removes everything
      } else {
        current.add(action);
        current.add('view'); // create/edit/delete implies view
      }
      return { ...g, permissions: { ...g.permissions, [menu]: [...current] } };
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    saveGroup(editing);
    setGroups(savedGroups());
    setEditing(null);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteGroup(deleteId);
      setGroups(savedGroups());
    }
    setDeleteId(null);
  };

  const menuCount = (g: UserGroup) =>
    MENU_OPTIONS.filter(m => (g.permissions[m.key] ?? []).length > 0).length;

  /* membersVersion in the deps makes counts/lists recompute after add/remove */
  void membersVersion;
  const members = membersGroup ? membersOfGroup(membersGroup.id, allUsers) : [];
  const nonMembers = membersGroup
    ? allUsers.filter(u => !members.some(m => m.user.id === u.id))
    : [];

  const handleAddMember = () => {
    if (!membersGroup || !addUserId) return;
    assignUserToGroup(addUserId, membersGroup.id);
    setAddUserId('');
    setMembersVersion(v => v + 1);
  };

  const handleRemoveMember = () => {
    if (removeUserId) {
      removeAssignment(removeUserId);
      setMembersVersion(v => v + 1);
    }
    setRemoveUserId(null);
  };

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Page header banner */}
        <div className="bg-navy-700 px-6 py-4 flex items-center justify-between shadow-md flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <ShieldCheck size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">จัดการกลุ่มและสิทธิ์</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-navy-200">กลุ่มผู้ใช้งานทั้งหมด</span>
                <span className="bg-white/25 text-white text-sm font-bold px-2.5 py-0.5 rounded-full">{groups.length} กลุ่ม</span>
              </div>
            </div>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl border-2 border-green-400 shadow-lg hover:shadow-xl hover:scale-105 transition-all text-base">
            <Plus size={20} /> เพิ่มกลุ่ม
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          <div className="card overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-xl">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="text-left text-lg font-semibold text-gray-600 px-4 py-2.5">ชื่อกลุ่ม</th>
                    <th scope="col" className="text-left text-lg font-semibold text-gray-600 px-4 py-2.5">คำอธิบาย</th>
                    <th scope="col" className="text-center text-lg font-semibold text-gray-600 px-4 py-2.5">เมนูที่เข้าถึงได้</th>
                    <th scope="col" className="text-center text-lg font-semibold text-gray-600 px-4 py-2.5">ประเภท</th>
                    <th scope="col" className="text-center text-lg font-semibold text-gray-600 px-4 py-2.5">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map(group => (
                    <tr key={group.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-bold text-navy-700">{group.name}</td>
                      <td className="px-4 py-2.5 text-gray-700">{group.description}</td>
                      <td className="px-4 py-2.5 text-center text-gray-700">{menuCount(group)} / {MENU_OPTIONS.length}</td>
                      <td className="px-4 py-2.5 text-center">
                        {group.isSystem ? (
                          <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-lg font-bold bg-gray-100 text-gray-600">
                            <Lock size={13} /> กลุ่มระบบ
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-sm px-3 py-1 rounded-lg font-bold bg-blue-100 text-blue-700">กำหนดเอง</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => setMembersGroup(group)} className="flex items-center gap-1 px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow transition-all">
                            <Users size={13} /> สมาชิก ({membersOfGroup(group.id, allUsers).length})
                          </button>
                          <button onClick={() => openEdit(group)} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow transition-all">
                            <Pencil size={13} /> แก้ไขสิทธิ์
                          </button>
                          {!group.isSystem && (
                            <button onClick={() => setDeleteId(group.id)} className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow transition-all">
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

      {/* Add/Edit group + permission matrix */}
      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={isNew ? 'เพิ่มกลุ่มผู้ใช้งาน' : `แก้ไขสิทธิ์ — ${editing?.name ?? ''}`}
        size="lg"
        icon={<ShieldCheck size={20} className="text-white" />}
      >
        {editing && (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="grp-name" className="label">ชื่อกลุ่ม</label>
                <input
                  id="grp-name"
                  type="text"
                  value={editing.name}
                  onChange={e => setEditing(g => g && { ...g, name: e.target.value })}
                  placeholder="เช่น ช่างซ่อมบำรุง"
                  className={`input-field ${editing.isSystem ? 'bg-gray-100 text-gray-500' : ''}`}
                  readOnly={editing.isSystem}
                  required
                />
              </div>
              <div>
                <label htmlFor="grp-desc" className="label">คำอธิบาย</label>
                <input
                  id="grp-desc"
                  type="text"
                  value={editing.description}
                  onChange={e => setEditing(g => g && { ...g, description: e.target.value })}
                  placeholder="กลุ่มนี้ใช้ทำอะไร"
                  className="input-field"
                />
              </div>
            </div>

            {/* Permission matrix */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-lg">
                <thead className="bg-navy-700">
                  <tr>
                    <th scope="col" className="text-left text-base font-bold text-white px-4 py-2.5">เมนู</th>
                    {ACTION_OPTIONS.map(a => (
                      <th key={a.key} scope="col" className="text-center text-base font-bold text-white px-3 py-2.5 w-20">{a.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MENU_OPTIONS.map((menu, i) => (
                    <tr key={menu.key} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}>
                      <td className="px-4 py-2 font-medium text-gray-800">{menu.label}</td>
                      {ACTION_OPTIONS.map(action => (
                        <td key={action.key} className="text-center px-3 py-2">
                          <input
                            type="checkbox"
                            aria-label={`${action.label} ${menu.label}`}
                            checked={(editing.permissions[menu.key] ?? []).includes(action.key)}
                            onChange={() => toggle(menu.key, action.key)}
                            className="w-5 h-5 rounded border-gray-300 accent-[#1b3a6b] cursor-pointer"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-base text-gray-500">
              การให้สิทธิ์ เพิ่ม/แก้ไข/ลบ จะเปิดสิทธิ์ "ดู" ให้อัตโนมัติ และการนำสิทธิ์ "ดู" ออกจะปิดทุกสิทธิ์ของเมนูนั้น
            </p>

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setEditing(null)} className="btn-secondary text-lg">ยกเลิก</button>
              <button type="submit" className="btn-primary text-lg">บันทึก</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Group members */}
      <Modal
        isOpen={membersGroup !== null}
        onClose={() => { setMembersGroup(null); setAddUserId(''); }}
        title={`สมาชิกกลุ่ม — ${membersGroup?.name ?? ''}`}
        size="md"
        icon={<Users size={20} className="text-white" />}
      >
        <div className="space-y-4">
          {/* Add member */}
          <div className="flex gap-2 items-end p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="flex-1">
              <label htmlFor="add-member" className="label">เพิ่มสมาชิกเข้ากลุ่ม</label>
              <select id="add-member" value={addUserId} onChange={e => setAddUserId(e.target.value)} className="input-field">
                <option value="" disabled>เลือกผู้ใช้...</option>
                {nonMembers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.username})</option>
                ))}
              </select>
            </div>
            <button onClick={handleAddMember} disabled={!addUserId} className="btn-primary text-lg py-2.5 disabled:opacity-60 disabled:cursor-not-allowed">
              <span className="flex items-center gap-1.5"><Plus size={16} /> เพิ่ม</span>
            </button>
          </div>

          {/* Member list */}
          {members.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <Users size={36} className="mx-auto mb-2 text-gray-300" />
              <p className="text-lg">ยังไม่มีสมาชิกในกลุ่มนี้</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
              {members.map(({ user, byAssignment }) => (
                <li key={user.id} className="flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-gray-50">
                  <div className="w-9 h-9 rounded-full bg-navy-100 border border-navy-300 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                    <UserIcon size={18} className="text-navy-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-navy-700 text-lg truncate">{user.name}</p>
                    <p className="text-sm text-gray-500 font-mono">{user.username}</p>
                  </div>
                  <RoleBadge role={user.role} />
                  {byAssignment ? (
                    <span className="text-xs font-bold px-2 py-1 rounded-lg bg-blue-100 text-blue-700 whitespace-nowrap">กำหนดเอง</span>
                  ) : (
                    <span className="text-xs font-bold px-2 py-1 rounded-lg bg-gray-100 text-gray-500 whitespace-nowrap">ตามบทบาท</span>
                  )}
                  {byAssignment && (
                    <button
                      onClick={() => setRemoveUserId(user.id)}
                      aria-label={`นำ ${user.name} ออกจากกลุ่ม`}
                      className="flex items-center gap-1 px-2 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                    >
                      <UserMinus size={13} /> นำออก
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-gray-500">
            สมาชิก "ตามบทบาท" มาจากค่าเริ่มต้นของบทบาทผู้ใช้ จะนำออกได้เฉพาะสมาชิกที่ถูกเพิ่มแบบ "กำหนดเอง"
            (การนำออกจะทำให้ผู้ใช้กลับไปใช้สิทธิ์ตามบทบาทเดิม)
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={removeUserId !== null}
        onClose={() => setRemoveUserId(null)}
        onConfirm={handleRemoveMember}
        title="นำสมาชิกออกจากกลุ่ม"
        message={`ต้องการนำ "${allUsers.find(u => u.id === removeUserId)?.name ?? ''}" ออกจากกลุ่มนี้ใช่หรือไม่? ผู้ใช้จะกลับไปใช้สิทธิ์ตามบทบาทเดิม`}
        confirmLabel="นำออก"
        danger
      />

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="ยืนยันการลบกลุ่ม"
        message={`ต้องการลบกลุ่ม "${groups.find(g => g.id === deleteId)?.name ?? ''}" ใช่หรือไม่? ผู้ใช้ในกลุ่มนี้จะกลับไปใช้สิทธิ์ตามบทบาทเดิม`}
        confirmLabel="ลบกลุ่ม"
        danger
      />
    </Layout>
  );
}
