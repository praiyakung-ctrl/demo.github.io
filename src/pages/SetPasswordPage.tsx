import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AccessibilityToolbar } from '../components/AccessibilityToolbar';
import { logAudit } from '../utils/auditLog';
import { updateMember } from '../utils/memberStorage';

function Req() {
  return <span className="text-red-600" aria-hidden="true"> *</span>;
}

export function SetPasswordPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  if (!user) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (next.length < 8) { setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'); return; }
    if (next !== confirm) { setError('รหัสผ่านและการยืนยันไม่ตรงกัน'); return; }

    updateMember(user.id, { mustChangePassword: false });
    updateUser({ ...user, mustChangePassword: false });
    logAudit(user, 'edit', 'ตั้งรหัสผ่าน', 'ตั้งรหัสผ่านสำหรับการเข้าใช้งานครั้งแรก');
    navigate('/portal', { replace: true });
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundImage: `linear-gradient(rgba(27,58,107,0.55), rgba(27,58,107,0.65)), url(${import.meta.env.BASE_URL}background01.webp)`, backgroundSize: 'cover', backgroundPosition: 'right center' }}>
      <div className="absolute top-3 right-3 z-10">
        <AccessibilityToolbar />
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="อบจ.ชลบุรี" className="h-24 w-24 mx-auto mb-3 object-contain" />
            <h1 className="text-white text-4xl font-bold">ตั้งรหัสผ่านเข้าใช้งาน</h1>
            <p className="text-blue-200 text-2xl">การเข้าใช้งานครั้งแรก</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <KeyRound size={36} className="text-navy-700" aria-hidden="true" />
              <h2 className="text-2xl font-bold text-gray-900">ยินดีต้อนรับ {user.name}</h2>
            </div>
            <p className="flex items-start gap-2 text-lg text-gray-600 bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
              <ShieldCheck size={20} className="text-navy-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
              ใบสมัครสมาชิกของท่านได้รับการอนุมัติแล้ว กรุณาตั้งรหัสผ่านสำหรับการเข้าใช้งานครั้งต่อไปก่อนใช้งานระบบ
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p role="alert" className="text-lg text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div>
                <label htmlFor="set-pw-new" className="label">รหัสผ่านใหม่<Req /></label>
                <input id="set-pw-new" type="password" value={next} onChange={e => setNext(e.target.value)} className="input-field" required minLength={8} />
              </div>
              <div>
                <label htmlFor="set-pw-confirm" className="label">ยืนยันรหัสผ่านใหม่<Req /></label>
                <input id="set-pw-confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="input-field" required minLength={8} />
              </div>
              <button type="submit" className="btn-primary w-full py-3 text-xl">บันทึกรหัสผ่านและเข้าใช้งาน</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
