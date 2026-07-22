import { useState } from 'react';
import { CheckCircle2, Database, RotateCcw, Settings, ShieldCheck, Timer } from 'lucide-react';
import { Layout } from '../components/Layout';
import { ConfirmDialog } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_SETTINGS, resetSystemSettings, savedSystemSettings, saveSystemSettings } from '../utils/systemSettings';
import type { SystemSettings } from '../utils/systemSettings';
import { logAudit } from '../utils/auditLog';

export function AdminSettingsPage() {
  const { can, user: currentUser } = useAuth();
  const readOnly = !can('adminSettings', 'edit');
  const [settings, setSettings] = useState<SystemSettings>(() => savedSystemSettings());
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const set = <K extends keyof SystemSettings>(key: K, val: SystemSettings[K]) => {
    setSaved(false);
    setSettings(s => ({ ...s, [key]: val }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSystemSettings(settings);
    logAudit(currentUser, 'edit', 'ตั้งค่าระบบ', 'บันทึกการตั้งค่าระบบ');
    setSaved(true);
  };

  const handleReset = () => {
    resetSystemSettings();
    setSettings(DEFAULT_SETTINGS);
    logAudit(currentUser, 'edit', 'ตั้งค่าระบบ', 'คืนค่าการตั้งค่าระบบเป็นค่าเริ่มต้น');
    setSaved(false);
    setConfirmReset(false);
  };

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Page header banner */}
        <div className="bg-blue-50 border-b-2 border-blue-100 px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-navy-700 rounded-xl flex items-center justify-center">
              <Settings size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-navy-700">ตั้งค่าระบบ</h1>
              <p className="text-sm text-gray-600 mt-0.5">การจัดเก็บข้อมูล ความปลอดภัย และข้อความ PDPA</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          <form onSubmit={handleSave} className="card overflow-hidden shadow-md max-w-3xl">
            <div className="p-4 space-y-4">

              {/* Section 1: data retention */}
              <div className="rounded-xl border-2 border-blue-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border-b border-blue-200">
                  <Database size={16} className="text-blue-600" />
                  <span className="text-sm font-bold text-blue-700">การจัดเก็บข้อมูล</span>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4">
                  <div>
                    <label htmlFor="set-video-retention" className="label">ระยะเวลาเก็บวิดีโอ (วัน)</label>
                    <input
                      id="set-video-retention"
                      type="number"
                      min={1}
                      value={settings.videoRetentionDays}
                      onChange={e => set('videoRetentionDays', Number(e.target.value))}
                      disabled={readOnly}
                      className="input-field"
                    />
                    <p className="text-sm text-gray-500 mt-1">วิดีโอจากกล้อง CCTV จะถูกลบอัตโนมัติเมื่อครบกำหนด</p>
                  </div>
                  <div>
                    <label htmlFor="set-log-retention" className="label">ระยะเวลาเก็บ Log (วัน)</label>
                    <input
                      id="set-log-retention"
                      type="number"
                      min={1}
                      value={settings.logRetentionDays}
                      onChange={e => set('logRetentionDays', Number(e.target.value))}
                      disabled={readOnly}
                      className="input-field"
                    />
                    <p className="text-sm text-gray-500 mt-1">รวมประวัติการใช้งานระบบและ log เหตุการณ์</p>
                  </div>
                </div>
              </div>

              {/* Section 2: security */}
              <div className="rounded-xl border-2 border-amber-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-200">
                  <Timer size={16} className="text-amber-600" />
                  <span className="text-sm font-bold text-amber-700">ความปลอดภัย</span>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-sm text-gray-600">
                    การเข้าสู่ระบบทุกบทบาทยืนยันตัวตนผ่านแอป ThaID (กรมการปกครอง) ไม่มีการใช้รหัสผ่านในระบบนี้
                  </p>
                  <div className="max-w-xs">
                    <label htmlFor="set-session-timeout" className="label">Session Timeout (นาที)</label>
                    <input
                      id="set-session-timeout"
                      type="number"
                      min={1}
                      value={settings.sessionTimeoutMinutes}
                      onChange={e => set('sessionTimeoutMinutes', Number(e.target.value))}
                      disabled={readOnly}
                      className="input-field"
                    />
                    <p className="text-sm text-gray-500 mt-1">ออกจากระบบอัตโนมัติเมื่อไม่มีการใช้งานตามเวลาที่กำหนด</p>
                  </div>
                </div>
              </div>

              {/* Section 3: PDPA */}
              <div className="rounded-xl border-2 border-green-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border-b border-green-200">
                  <ShieldCheck size={16} className="text-green-600" />
                  <span className="text-sm font-bold text-green-700">การคุ้มครองข้อมูลส่วนบุคคล (PDPA)</span>
                </div>
                <div className="p-4">
                  <label htmlFor="set-pdpa-text" className="label">ข้อความขอความยินยอม (Consent)</label>
                  <textarea
                    id="set-pdpa-text"
                    rows={5}
                    value={settings.pdpaConsentText}
                    onChange={e => set('pdpaConsentText', e.target.value)}
                    disabled={readOnly}
                    className="input-field"
                  />
                  <p className="text-sm text-gray-500 mt-1">แสดงในแบนเนอร์ขอความยินยอมก่อนเข้าใช้งานระบบ</p>
                </div>
              </div>
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
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={handleReset}
        title="คืนค่าเริ่มต้น"
        message="ต้องการคืนการตั้งค่าระบบทั้งหมดกลับเป็นค่าเริ่มต้นใช่หรือไม่?"
        confirmLabel="คืนค่าเริ่มต้น"
        danger
      />
    </Layout>
  );
}
