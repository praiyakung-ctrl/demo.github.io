import { useEffect, useState } from 'react';
import { CheckCircle2, QrCode, Smartphone } from 'lucide-react';
import { mockThaIdVerify, DEMO_THAID_PROFILES } from '../utils/thaId';
import type { ThaIdProfile } from '../utils/thaId';

interface Props {
  onVerified: (profile: ThaIdProfile) => void;
  showDemoShortcuts?: boolean;
  title?: string;
  subtitle?: string;
}

/* Fixed decorative pattern — never actually encodes/decodes anything, it is
   set-dressing while the mock verification timer runs. */
const QR_CELLS = [
  1, 1, 1, 0, 1, 0, 1, 1, 1,
  1, 0, 1, 0, 0, 0, 1, 0, 1,
  1, 1, 1, 1, 0, 1, 1, 1, 1,
  0, 0, 0, 1, 1, 0, 0, 1, 0,
  1, 0, 1, 0, 1, 1, 1, 0, 1,
  0, 1, 0, 1, 0, 0, 1, 1, 0,
  1, 1, 1, 0, 1, 1, 1, 0, 1,
  1, 0, 1, 0, 0, 0, 1, 0, 1,
  1, 1, 1, 1, 1, 0, 1, 1, 1,
];

const DEMO_ROLE_LABELS: { key: keyof typeof DEMO_THAID_PROFILES; label: string }[] = [
  { key: 'admin', label: 'ผู้ดูแลระบบ' },
  { key: 'operator', label: 'เจ้าหน้าที่' },
  { key: 'executive', label: 'ผู้บริหาร' },
  { key: 'citizen', label: 'ประชาชน' },
];

export function ThaIdLoginPanel({ onVerified, showDemoShortcuts, title, subtitle }: Props) {
  const [status, setStatus] = useState<'scanning' | 'confirmed'>('scanning');

  useEffect(() => {
    let cancelled = false;
    setStatus('scanning');
    mockThaIdVerify().then(profile => {
      if (cancelled) return;
      setStatus('confirmed');
      setTimeout(() => { if (!cancelled) onVerified(profile); }, 500);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when the panel itself remounts
  }, []);

  const runDemo = (key: keyof typeof DEMO_THAID_PROFILES) => {
    onVerified(DEMO_THAID_PROFILES[key]);
  };

  return (
    <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Smartphone size={22} className="text-navy-700" aria-hidden="true" />
        <h3 className="text-2xl font-bold text-gray-900">{title ?? 'ยืนยันตัวตนด้วย ThaID'}</h3>
      </div>
      <p className="text-lg text-gray-600 text-center mb-4">
        {subtitle ?? 'เปิดแอป ThaID บนโทรศัพท์ของท่าน แล้วสแกน QR โค้ดนี้เพื่อยืนยันตัวตน'}
      </p>

      <div className="w-40 h-40 mx-auto mb-4 bg-white rounded-lg border-2 border-navy-200 p-2 grid grid-cols-9 grid-rows-9 gap-px" role="img" aria-label="QR โค้ดสำหรับสแกนด้วยแอป ThaID">
        {QR_CELLS.map((on, i) => (
          <div key={i} className={on ? 'bg-navy-900' : 'bg-white'} />
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 text-lg font-medium" role="status">
        {status === 'scanning' ? (
          <>
            <QrCode size={20} className="text-navy-700 animate-pulse" aria-hidden="true" />
            <span className="text-navy-700">กำลังรอการยืนยันจากแอป ThaID...</span>
          </>
        ) : (
          <>
            <CheckCircle2 size={20} className="text-green-600" aria-hidden="true" />
            <span className="text-green-700">ยืนยันตัวตนสำเร็จ</span>
          </>
        )}
      </div>

      {showDemoShortcuts && (
        <div className="mt-5 p-3 bg-white rounded-lg border border-gray-200">
          <p className="text-base font-semibold text-gray-500 mb-2">จำลองโปรไฟล์ ThaID (Demo)</p>
          <div className="grid grid-cols-2 gap-1.5">
            {DEMO_ROLE_LABELS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => runDemo(key)}
                className="text-lg px-2 py-1.5 rounded-md font-medium bg-gray-100 text-navy-700 hover:opacity-80 transition-opacity text-left"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
