import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThaIdLoginPanel } from '../components/ThaIdLoginPanel';
import { AccessibilityToolbar } from '../components/AccessibilityToolbar';
import { PdpaConsentBanner } from '../components/PdpaConsentBanner';
import { hasPdpaConsent, savePdpaConsent } from '../utils/pdpaConsent';
import type { ThaIdProfile } from '../utils/thaId';

export function LoginPage() {
  const { loginWithThaId, user } = useAuth();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [showPdpa, setShowPdpa] = useState(() => !hasPdpaConsent());

  if (user) {
    const redirect = user.role === 'executive' ? '/dashboard' : user.role === 'citizen' ? '/portal' : '/map';
    return <Navigate to={redirect} replace />;
  }

  const handleVerified = (profile: ThaIdProfile) => {
    const ok = loginWithThaId(profile);
    if (!ok) {
      setError('ไม่พบบัญชีที่ผูกกับ ThaID นี้ กรุณาสมัครสมาชิกก่อนเข้าใช้งาน');
      setAttempt(a => a + 1); // remounts the panel so it can scan again
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundImage: `linear-gradient(rgba(27,58,107,0.55), rgba(27,58,107,0.65)), url(${import.meta.env.BASE_URL}background01.webp)`, backgroundSize: 'cover', backgroundPosition: 'right center' }}>
      {/* Accessibility toolbar */}
      <div className="absolute top-3 right-3 z-10">
        <AccessibilityToolbar />
      </div>

      {/* Centered form */}
      <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="อบจ.ชลบุรี" className="h-32 w-32 mx-auto mb-4 object-contain" />
          <p className="text-white text-3xl font-bold mb-2">โครงการพัฒนาศักยภาพด้านความปลอดภัยบริเวณพื้นที่เสี่ยงภัยและเส้นทางคมนาคม บริเวณพื้นที่สาธารณะเสี่ยงภัยชุมชนในพื้นที่จังหวัดชลบุรี</p>
          <h1 className="text-white text-4xl font-bold leading-tight mb-2">ระบบฐานข้อมูลเพื่อการเข้าถึง</h1>
          <p className="text-blue-200 text-4xl font-bold">Data Integration and End Users</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Shield size={40} className="text-navy-700" />
            <h2 className="text-4xl font-bold text-gray-900">เข้าสู่ระบบด้วย ThaID</h2>
          </div>

          {error && <p role="alert" className="text-lg text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}

          <ThaIdLoginPanel key={attempt} showDemoShortcuts onVerified={handleVerified} />

          <p className="mt-4 text-center text-lg text-gray-600">
            ยังไม่มีบัญชี?{' '}
            <Link to="/register" className="text-navy-700 hover:text-navy-500 hover:underline font-semibold">
              สมัครสมาชิกสำหรับประชาชน
            </Link>
          </p>

          {/* Public info pages — readable without logging in */}
          <p className="mt-2 text-center text-lg text-gray-600">
            <Link to="/about" className="text-navy-700 hover:text-navy-500 hover:underline">เกี่ยวกับ อบจ.ชลบุรี</Link>
            <span className="mx-2 text-gray-300">·</span>
            <Link to="/faq" className="text-navy-700 hover:text-navy-500 hover:underline">คำถามที่พบบ่อย</Link>
            <span className="mx-2 text-gray-300">·</span>
            <Link to="/manual" className="text-navy-700 hover:text-navy-500 hover:underline">คู่มือการใช้งาน</Link>
          </p>
        </div>
      </div>
      </div>

      {/* PDPA consent banner */}
      <PdpaConsentBanner
        isOpen={showPdpa}
        onAccept={() => { savePdpaConsent(); setShowPdpa(false); }}
      />
    </div>
  );
}
