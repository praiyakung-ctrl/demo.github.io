import { useState } from 'react';
import { Mail } from 'lucide-react';
import { sendOtpEmail } from '../utils/emailApi';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  initialEmail?: string;
  onVerified: (email: string) => void;
}

/* Sends a real 6-digit code to the address the applicant types in, via the
   Cloudflare Worker email proxy. The code is generated and checked entirely
   client-side (this app has no backend to hold session state) — good enough
   to confirm the applicant actually controls that inbox, which is the real
   gap left by the mocked Google sign-in (see googleAuth.ts). If the email
   send fails (e.g. VITE_EMAIL_WORKER_URL not configured in this environment)
   the generated code is shown inline instead, so the registration demo still
   works end-to-end without a deployed Worker. */
export function EmailOtpPanel({ initialEmail, onVerified }: Props) {
  const [email, setEmail] = useState(initialEmail ?? '');
  const [stage, setStage] = useState<'enter-email' | 'code-sent'>('enter-email');
  const [code, setCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');

  const emailValid = EMAIL_RE.test(email);

  const handleSend = async () => {
    if (!emailValid) { setError('กรุณากรอกอีเมลให้ถูกต้อง'); return; }
    setError('');
    setSending(true);
    const newCode = String(Math.floor(100000 + Math.random() * 900000));
    const ok = await sendOtpEmail(email, newCode);
    setCode(newCode);
    setDevCode(ok ? '' : newCode);
    setInputCode('');
    setSending(false);
    setStage('code-sent');
  };

  const handleVerify = () => {
    if (inputCode.trim() !== code) { setError('รหัสไม่ถูกต้อง กรุณาลองใหม่'); return; }
    onVerified(email);
  };

  return (
    <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Mail size={22} className="text-navy-700" aria-hidden="true" />
        <h3 className="text-2xl font-bold text-gray-900">ยืนยันอีเมลด้วยรหัส OTP</h3>
      </div>

      {stage === 'enter-email' ? (
        <>
          <label htmlFor="otp-email" className="label">อีเมลของท่าน<span className="text-red-600" aria-hidden="true"> *</span></label>
          <input
            id="otp-email" type="email" value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            placeholder="name@example.com" className="input-field"
          />
          {error && <p role="alert" className="text-base text-red-600 mt-1">{error}</p>}
          <button
            type="button" onClick={handleSend} disabled={sending || !emailValid}
            className="btn-primary w-full py-2.5 text-lg mt-3 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {sending ? 'กำลังส่งรหัส...' : 'ส่งรหัสยืนยัน (OTP)'}
          </button>
        </>
      ) : (
        <>
          <p className="text-base text-gray-600 mb-2">ระบบส่งรหัสยืนยัน 6 หลักไปที่ <span className="font-semibold">{email}</span> แล้ว</p>
          {devCode && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
              ไม่สามารถส่งอีเมลได้ในขณะนี้ (โหมดทดสอบ) — ใช้รหัสนี้แทน: <span className="font-mono font-bold">{devCode}</span>
            </p>
          )}
          <label htmlFor="otp-code" className="label">กรอกรหัสยืนยัน<span className="text-red-600" aria-hidden="true"> *</span></label>
          <input
            id="otp-code" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
            value={inputCode}
            onChange={e => { setInputCode(e.target.value.replace(/\D/g, '')); setError(''); }}
            placeholder="เช่น 123456" className="input-field tracking-widest text-center text-2xl font-bold"
          />
          {error && <p role="alert" className="text-base text-red-600 mt-1">{error}</p>}
          <div className="flex gap-2 mt-3">
            <button
              type="button" onClick={handleVerify} disabled={inputCode.length !== 6}
              className="btn-primary flex-1 py-2.5 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              ยืนยันรหัส
            </button>
            <button type="button" onClick={handleSend} disabled={sending} className="btn-secondary py-2.5 text-lg">
              ส่งอีกครั้ง
            </button>
          </div>
        </>
      )}
    </div>
  );
}
