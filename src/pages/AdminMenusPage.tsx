import { useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, ListTree, Lock, RotateCcw } from 'lucide-react';
import { Layout } from '../components/Layout';
import { ConfirmDialog } from '../components/Modal';
import { LOCKED_MENUS, resetMenuSettings, savedMenuSettings, saveMenuSettings } from '../utils/menuStorage';
import { MENU_OPTIONS } from '../types';
import type { MenuSetting } from '../types';
import { Pagination } from '../components/Pagination';

const PAGE_SIZE = 10;

const MENU_PATHS: Record<string, string> = {
  map: '/map', dashboard: '/dashboard', portal: '/portal', reports: '/reports',
  adminCameras: '/admin/cameras', adminUsers: '/admin/users',
  adminRepairs: '/admin/repairs', adminGroups: '/admin/groups', adminMenus: '/admin/menus',
};

export function AdminMenusPage() {
  const [settings, setSettings] = useState<MenuSetting[]>(() => savedMenuSettings());
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(settings.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = settings.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const update = (key: string, patch: Partial<MenuSetting>) => {
    setSaved(false);
    setSettings(prev => prev.map(s => (s.key === key ? { ...s, ...patch } : s)));
  };

  const move = (index: number, dir: -1 | 1) => {
    setSaved(false);
    setSettings(prev => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((s, i) => ({ ...s, order: i }));
    });
  };

  const handleSave = () => {
    saveMenuSettings(settings.map((s, i) => ({ ...s, order: i })));
    setSaved(true);
  };

  const handleReset = () => {
    resetMenuSettings();
    setSettings(savedMenuSettings());
    setSaved(false);
    setConfirmReset(false);
  };

  const defaultLabel = (key: string) => MENU_OPTIONS.find(m => m.key === key)?.label ?? key;

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Page header banner */}
        <div className="bg-blue-50 border-b-2 border-blue-100 px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-navy-700 rounded-xl flex items-center justify-center">
              <ListTree size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-navy-700">จัดการเมนู</h1>
              <p className="text-sm text-gray-600 mt-0.5">เปลี่ยนชื่อ จัดลำดับ และเปิด/ปิดเมนูของระบบ (มีผลกับทุกกลุ่มผู้ใช้)</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          <div className="card overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-xl">
                <thead className="bg-blue-200">
                  <tr>
                    <th scope="col" className="text-center text-xl font-semibold text-navy-700 px-4 py-2.5 w-28">ลำดับ</th>
                    <th scope="col" className="text-left text-xl font-semibold text-navy-700 px-4 py-2.5">ชื่อเมนู</th>
                    <th scope="col" className="text-left text-xl font-semibold text-navy-700 px-4 py-2.5">เส้นทาง</th>
                    <th scope="col" className="text-center text-xl font-semibold text-navy-700 px-4 py-2.5 w-40">เปิดใช้งาน</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((setting, idx) => {
                    const i = (safePage - 1) * PAGE_SIZE + idx; // index in the full settings list
                    const locked = LOCKED_MENUS.includes(setting.key);
                    return (
                      <tr key={setting.key} className={`border-t border-gray-50 ${setting.enabled ? 'hover:bg-gray-50' : 'bg-gray-50/80 opacity-70'}`}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-bold text-gray-500 w-6 text-right">{i + 1}</span>
                            <button
                              onClick={() => move(i, -1)}
                              disabled={i === 0}
                              aria-label={`เลื่อน ${setting.label} ขึ้น`}
                              className="p-1.5 rounded-lg text-navy-500 hover:bg-navy-50 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ArrowUp size={16} />
                            </button>
                            <button
                              onClick={() => move(i, 1)}
                              disabled={i === settings.length - 1}
                              aria-label={`เลื่อน ${setting.label} ลง`}
                              className="p-1.5 rounded-lg text-navy-500 hover:bg-navy-50 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ArrowDown size={16} />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={setting.label}
                            onChange={e => update(setting.key, { label: e.target.value })}
                            aria-label={`ชื่อเมนู ${defaultLabel(setting.key)}`}
                            className="input-field max-w-sm"
                          />
                          {setting.label !== defaultLabel(setting.key) && (
                            <p className="text-sm text-gray-400 mt-1">ชื่อมาตรฐาน: {defaultLabel(setting.key)}</p>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-base text-gray-500">{MENU_PATHS[setting.key]}</td>
                        <td className="px-4 py-2.5 text-center">
                          {locked ? (
                            <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-lg font-bold bg-gray-100 text-gray-500" title="เมนูสำหรับกู้คืนระบบ ปิดไม่ได้">
                              <Lock size={13} /> เปิดเสมอ
                            </span>
                          ) : (
                            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-lg text-gray-700">
                              <input
                                type="checkbox"
                                checked={setting.enabled}
                                onChange={e => update(setting.key, { enabled: e.target.checked })}
                                aria-label={`เปิดใช้งานเมนู ${setting.label}`}
                                className="w-5 h-5 rounded border-gray-300 accent-[#1b3a6b] cursor-pointer"
                              />
                              {setting.enabled ? 'เปิด' : 'ปิด'}
                            </label>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination total={settings.length} page={safePage} pageSize={PAGE_SIZE} onPageChange={setPage} />

            {/* Footer actions */}
            <div className="flex items-center justify-between gap-3 p-4 bg-gray-50 border-t border-gray-100">
              <button onClick={() => setConfirmReset(true)} className="btn-secondary text-lg flex items-center gap-2">
                <RotateCcw size={16} /> คืนค่าเริ่มต้น
              </button>
              <div className="flex items-center gap-3">
                {saved && (
                  <span role="status" className="flex items-center gap-1.5 text-lg font-bold text-green-700">
                    <CheckCircle2 size={18} /> บันทึกแล้ว
                  </span>
                )}
                <button onClick={handleSave} className="btn-primary text-lg">บันทึกการตั้งค่า</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={handleReset}
        title="คืนค่าเริ่มต้น"
        message="ต้องการคืนชื่อ ลำดับ และสถานะของเมนูทั้งหมดกลับเป็นค่าเริ่มต้นใช่หรือไม่?"
        confirmLabel="คืนค่าเริ่มต้น"
        danger
      />
    </Layout>
  );
}
