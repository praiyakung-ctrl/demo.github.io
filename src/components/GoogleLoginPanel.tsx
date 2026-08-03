import { useEffect, useState } from 'react';
import { CheckCircle2, Mail } from 'lucide-react';
import { mockGoogleVerify, DEMO_GOOGLE_PROFILE } from '../utils/googleAuth';
import type { GoogleProfile } from '../utils/googleAuth';

interface Props {
  onVerified: (profile: GoogleProfile) => void;
  showDemoShortcut?: boolean;
  title?: string;
  subtitle?: string;
}

export function GoogleLoginPanel({ onVerified, showDemoShortcut, title, subtitle }: Props) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'confirmed'>('idle');

  useEffect(() => {
    return () => setStatus('idle');
  }, []);

  const start = (hint?: Partial<GoogleProfile>) => {
    setStatus('connecting');
    mockGoogleVerify(hint).then(profile => {
      setStatus('confirmed');
      setTimeout(() => onVerified(profile), 500);
    });
  };

  return (
    <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Mail size={22} className="text-navy-700" aria-hidden="true" />
        <h3 className="text-2xl font-bold text-gray-900">{title ?? 'ยืนยันตัวตนด้วย Google'}</h3>
      </div>
      <p className="text-lg text-gray-600 text-center mb-4">
        {subtitle ?? 'สำหรับชาวต่างชาติ — เข้าสู่ระบบด้วยบัญชี Gmail ของท่านผ่าน Google OAuth 2.0'}
      </p>

      {status === 'idle' && (
        <button
          type="button"
          onClick={() => start()}
          className="btn-primary w-full py-3 text-xl flex items-center justify-center gap-2"
        >
          <Mail size={22} aria-hidden="true" /> เข้าสู่ระบบด้วย Google
        </button>
      )}

      {status !== 'idle' && (
        <div className="flex items-center justify-center gap-2 text-lg font-medium py-2" role="status">
          {status === 'connecting' ? (
            <>
              <Mail size={20} className="text-navy-700 animate-pulse" aria-hidden="true" />
              <span className="text-navy-700">กำลังเชื่อมต่อกับ Google...</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={20} className="text-green-600" aria-hidden="true" />
              <span className="text-green-700">ยืนยันตัวตนสำเร็จ</span>
            </>
          )}
        </div>
      )}

      {showDemoShortcut && status === 'idle' && (
        <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200 text-center">
          <p className="text-base font-semibold text-gray-500 mb-2">จำลองบัญชี Google (Demo)</p>
          <button
            type="button"
            onClick={() => start(DEMO_GOOGLE_PROFILE)}
            className="text-lg px-3 py-1.5 rounded-md font-medium bg-gray-100 text-navy-700 hover:opacity-80 transition-opacity"
          >
            {DEMO_GOOGLE_PROFILE.name} ({DEMO_GOOGLE_PROFILE.email})
          </button>
        </div>
      )}
    </div>
  );
}
