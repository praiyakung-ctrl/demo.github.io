import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, MailCheck, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { AccessibilityToolbar } from '../components/AccessibilityToolbar';
import { PdpaConsentBanner } from '../components/PdpaConsentBanner';
import { hasPdpaConsent, savePdpaConsent } from '../utils/pdpaConsent';

export function LoginPage() {
  const { login, loginAsGoogle, user } = useAuth();
  const [username, setUsername] = useState(() => localStorage.getItem('remembered_username') ?? '');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('remembered_username') !== null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [showPdpa, setShowPdpa] = useState(() => !hasPdpaConsent());

  if (user) {
    const redirect = user.role === 'executive' ? '/dashboard' : user.role === 'citizen' ? '/portal' : '/map';
    return <Navigate to={redirect} replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 500));
    const ok = login(username, password);
    if (ok) {
      if (rememberMe) {
        localStorage.setItem('remembered_username', username);
      } else {
        localStorage.removeItem('remembered_username');
      }
    } else {
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    loginAsGoogle();
    setLoading(false);
  };

  const fillDemo = (u: string, p: string) => { setUsername(u); setPassword(p); setError(''); };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSending(true);
    await new Promise(r => setTimeout(r, 600));
    setForgotSending(false);
    setForgotSent(true);
  };

  const closeForgot = () => {
    setShowForgot(false);
    setForgotEmail('');
    setForgotSending(false);
    setForgotSent(false);
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
            <h2 className="text-4xl font-bold text-gray-900">เข้าสู่ระบบ</h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-username" className="label">ชื่อผู้ใช้</label>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="กรอกชื่อผู้ใช้"
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="login-password" className="label">รหัสผ่าน</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่าน"
                  className="input-field pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-lg text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 accent-[#1b3a6b] cursor-pointer"
                />
                จำฉันไว้
              </label>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-lg text-navy-700 hover:text-navy-500 hover:underline font-medium"
              >
                ลืมรหัสผ่าน?
              </button>
            </div>

            {error && <p role="alert" className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-xl disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-2xl text-gray-500">หรือ</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-3 text-2xl font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            เข้าสู่ระบบด้วย Google (สำหรับประชาชน)
          </button>

          {/* Demo credentials */}
          <div className="mt-5 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-lg font-semibold text-gray-500 mb-2">บัญชีทดสอบ (Demo)</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: 'ผู้ดูแลระบบ', u: 'admin', p: 'admin1234', color: 'bg-purple-100 text-purple-700' },
                { label: 'เจ้าหน้าที่', u: 'operator', p: 'oper1234', color: 'bg-blue-100 text-blue-700' },
                { label: 'ผู้บริหาร', u: 'executive', p: 'exec1234', color: 'bg-amber-100 text-amber-700' },
              ].map(({ label, u, p, color }) => (
                <button
                  key={u}
                  onClick={() => fillDemo(u, p)}
                  className={`text-lg px-2 py-1.5 rounded-md font-medium ${color} hover:opacity-80 transition-opacity text-left`}
                >
                  {label}<br />
                  <span className="font-mono opacity-70">{u}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Forgot password modal */}
      <Modal
        isOpen={showForgot}
        onClose={closeForgot}
        title="ลืมรหัสผ่าน"
        size="sm"
        icon={<KeyRound size={20} className="text-white" />}
      >
        {forgotSent ? (
          <div className="text-center py-2">
            <MailCheck size={48} className="text-green-600 mx-auto mb-3" />
            <p className="text-xl font-semibold text-gray-900 mb-1">ส่งลิงก์เรียบร้อยแล้ว</p>
            <p className="text-lg text-gray-600 mb-5">
              ส่งลิงก์รีเซ็ตรหัสผ่านไปที่ <span className="font-medium text-gray-900">{forgotEmail}</span> แล้ว
              กรุณาตรวจสอบอีเมลของท่าน
            </p>
            <button onClick={closeForgot} className="btn-primary w-full py-2.5 text-lg">ปิด</button>
          </div>
        ) : (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <p className="text-lg text-gray-600">
              กรอกอีเมลที่ลงทะเบียนไว้ ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้
            </p>
            <div>
              <label htmlFor="forgot-email" className="label">อีเมล</label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                placeholder="กรอกอีเมลของท่าน"
                className="input-field"
                required
              />
            </div>
            <button
              type="submit"
              disabled={forgotSending}
              className="btn-primary w-full py-2.5 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {forgotSending ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
            </button>
          </form>
        )}
      </Modal>

      {/* PDPA consent banner */}
      <PdpaConsentBanner
        isOpen={showPdpa}
        onAccept={() => { savePdpaConsent(); setShowPdpa(false); }}
      />
    </div>
  );
}
