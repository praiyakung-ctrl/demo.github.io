import { useState } from 'react';
import { CheckCircle2, ClipboardCheck } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { savedCctvApprovers, saveCctvApprovers } from '../utils/cctvApprovers';
import type { CctvApproverSettings } from '../utils/cctvApprovers';
import { savedUsers } from '../utils/userStorage';
import { logAudit } from '../utils/auditLog';
import type { ApprovalLevel } from '../types';

const LEVELS: { level: ApprovalLevel; key: keyof CctvApproverSettings; title: string; description: string; wrapClass: string; headerClass: string; titleClass: string }[] = [
  {
    level: 1, key: 'level1', title: 'ระดับ 1 — เจ้าหน้าที่ผู้รับเรื่อง',
    description: 'ตรวจสอบความถูกต้องของเอกสารหลักฐานเบื้องต้นและระบุกล้องที่ใกล้ที่สุด (เจ้าหน้าที่ Outsource)',
    wrapClass: 'border-blue-200', headerClass: 'bg-blue-50 border-blue-200', titleClass: 'text-blue-700',
  },
  {
    level: 2, key: 'level2', title: 'ระดับ 2 — หัวหน้างาน',
    description: 'พิจารณาอนุมัติในลำดับถัดจากเจ้าหน้าที่ผู้รับเรื่อง',
    wrapClass: 'border-amber-200', headerClass: 'bg-amber-50 border-amber-200', titleClass: 'text-amber-700',
  },
  {
    level: 3, key: 'level3', title: 'ระดับ 3 — ผู้อนุมัติขั้นสุดท้าย',
    description: 'ผู้อำนวยการศูนย์เทคโนโลยี หรือผู้ที่ได้รับมอบหมาย',
    wrapClass: 'border-green-200', headerClass: 'bg-green-50 border-green-200', titleClass: 'text-green-700',
  },
];

export function AdminCctvApproversPage() {
  const { can, user: currentUser } = useAuth();
  const readOnly = !can('adminCctvApprovers', 'edit');
  const [settings, setSettings] = useState<CctvApproverSettings>(() => savedCctvApprovers());
  const [saved, setSaved] = useState(false);
  const staffUsers = savedUsers().filter(u => u.isActive);

  const toggle = (key: keyof CctvApproverSettings, userId: string) => {
    setSaved(false);
    setSettings(s => ({
      ...s,
      [key]: s[key].includes(userId) ? s[key].filter(id => id !== userId) : [...s[key], userId],
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveCctvApprovers(settings);
    logAudit(currentUser, 'edit', 'ตั้งค่าผู้อนุมัติคำขอ CCTV', 'บันทึกรายชื่อผู้อนุมัติคำขอดูกล้อง CCTV ทั้ง 3 ระดับ');
    setSaved(true);
  };

  return (
    <Layout>
      <div className="flex flex-col h-full">
        <div className="bg-blue-50 border-b-2 border-blue-100 px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-navy-700 rounded-xl flex items-center justify-center">
              <ClipboardCheck size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-navy-700">ตั้งค่าผู้อนุมัติคำขอ CCTV</h1>
              <p className="text-sm text-gray-600 mt-0.5">กำหนดผู้ใช้งานที่มีสิทธิ์อนุมัติคำขอดูกล้อง CCTV แต่ละระดับ (เลือกได้มากกว่า 1 คนต่อระดับ)</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <form onSubmit={handleSave} className="card overflow-hidden shadow-md max-w-3xl">
            <div className="p-4 space-y-4">
              {LEVELS.map(lvl => (
                <div key={lvl.key} className={`rounded-xl border-2 ${lvl.wrapClass} overflow-hidden`}>
                  <div className={`px-4 py-2.5 border-b ${lvl.headerClass}`}>
                    <p className={`text-sm font-bold ${lvl.titleClass}`}>{lvl.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{lvl.description}</p>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-2">
                    {staffUsers.map(u => (
                      <label key={u.id} className="flex items-center gap-2 text-lg text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings[lvl.key].includes(u.id)}
                          onChange={() => toggle(lvl.key, u.id)}
                          disabled={readOnly}
                          className="w-4 h-4 accent-[#1b3a6b]"
                        />
                        {u.name} <span className="text-sm text-gray-400">({u.department ?? u.username})</span>
                      </label>
                    ))}
                  </div>
                  {settings[lvl.key].length === 0 && (
                    <p className="text-sm text-red-600 px-4 pb-3">ยังไม่ได้กำหนดผู้อนุมัติระดับนี้ — คำขอจะค้างรอโดยไม่มีใครอนุมัติได้</p>
                  )}
                </div>
              ))}
            </div>

            {!readOnly && (
              <div className="flex items-center justify-end gap-3 p-4 bg-gray-50 border-t border-gray-100">
                {saved && (
                  <span role="status" className="flex items-center gap-1.5 text-lg font-bold text-green-700">
                    <CheckCircle2 size={18} /> บันทึกแล้ว
                  </span>
                )}
                <button type="submit" className="btn-primary text-lg">บันทึกการตั้งค่า</button>
              </div>
            )}
          </form>
        </div>
      </div>
    </Layout>
  );
}
