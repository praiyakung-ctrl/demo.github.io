import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { findRequestByDownloadToken } from '../utils/requestStorage';

/* Landing page for the "เข้าสู่ระบบเพื่อดาวน์โหลด" magic-link button in the
   video-ready email — auto-logs the citizen in via a client-side token
   (see AuthContext.loginWithVideoToken) so they don't have to go through
   ThaID/Google again just to download the footage they requested. */
export function VideoAccessPage() {
  const { loginWithVideoToken } = useAuth();
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get('token') ?? '';
  const valid = Boolean(findRequestByDownloadToken(token));

  useEffect(() => {
    if (valid) {
      loginWithVideoToken(token);
      navigate('/portal', { replace: true });
    }
    // login/navigate once on mount for this token — token is fixed for the page's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (valid) return null;

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-4">
      <div className="card max-w-md w-full p-8 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle size={32} className="text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">ลิงก์ไม่ถูกต้องหรือหมดอายุ</h1>
        <p className="text-lg text-gray-500">ลิงก์เข้าสู่ระบบนี้ใช้งานไม่ได้แล้ว กรุณาเข้าสู่ระบบด้วยตนเองแทน</p>
        <Link to="/login" className="btn-primary inline-flex items-center gap-2">
          <ShieldCheck size={20} /> ไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    </div>
  );
}
