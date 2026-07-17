import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, ChevronDown, CircleUser, AlertTriangle, CheckCircle, Car, Crosshair, FileSearch, ParkingSquare, Waves, Wrench, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from './Badge';
import { AccessibilityToolbar } from './AccessibilityToolbar';
import { ROLE_LABELS, EVENT_LABELS, EVENT_COLORS, EVENT_TEXT_COLORS } from '../types';
import eventsData from '../data/events.json';
import requestsData from '../data/requests.json';
import type { CctvEvent, CitizenRequest } from '../types';
import { timeAgo } from '../utils/formatDate';
import { pendingReports } from '../utils/cameraReports';
import { savedNotificationSettings } from '../utils/notificationSettings';

const allEvents = eventsData as CctvEvent[];
const allRequests = requestsData as CitizenRequest[];

// same inbox selection as CitizenPortalPage, so the bell matches "คำขอของฉัน"
const myRequests = allRequests.filter(r => r.email === 'citizen@gmail.com').concat(
  allRequests.filter(r => r.email !== 'citizen@gmail.com').slice(0, 2)
);

function latestActivity(req: CitizenRequest): string {
  const done = req.timeline?.filter(t => t.completed && t.timestamp);
  return done?.length ? done[done.length - 1].timestamp! : req.submittedAt;
}

const EVENT_TYPE_ICONS = {
  normal:  CheckCircle,
  traffic: Car,
  gunshot: Crosshair,
  parking: ParkingSquare,
  flood:   Waves,
  crowd:   Users,
} as const;

export function Navbar() {
  const { user, logout, isCitizen, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [showUser, setShowUser] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const notifBtnRef = useRef<HTMLButtonElement>(null);
  const userBtnRef = useRef<HTMLButtonElement>(null);

  // close dropdowns on outside click or Escape (returning focus to the toggle)
  useEffect(() => {
    if (!showNotif && !showUser) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (notifRef.current?.contains(t) || userRef.current?.contains(t)) return;
      setShowNotif(false);
      setShowUser(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showNotif) notifBtnRef.current?.focus();
      if (showUser) userBtnRef.current?.focus();
      setShowNotif(false);
      setShowUser(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [showNotif, showUser]);

  // honor per-event-type enable flags from /admin/notifications (read fresh — dropdown toggles re-render)
  const notifRules = savedNotificationSettings().events;
  const unackEvents = allEvents.filter(e =>
    !e.isAcknowledged && (e.eventType === 'normal' || notifRules[e.eventType]?.enabled !== false)
  );
  // admins also see cameras reported for inspection (read fresh — dropdown toggles re-render)
  const repairReports = isAdmin ? pendingReports() : [];
  // citizens are notified about their CCTV request status, not CCTV events
  const activeRequests = myRequests.filter(r => r.status !== 'ได้รับแล้ว' && r.status !== 'ปฏิเสธ');
  const unackCount = isCitizen ? activeRequests.length : unackEvents.length + repairReports.length;

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const DAYS_TH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const MONTHS_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const dateStr = `วัน${DAYS_TH[time.getDay()]}ที่ ${time.getDate()} ${MONTHS_TH[time.getMonth()]} พ.ศ. ${time.getFullYear() + 543}`;

  return (
    <header className="relative h-20 bg-navy-700 flex items-center px-4 gap-3 z-[1000] shadow-lg">
      {/* Logo + Title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <img
          src={`${import.meta.env.BASE_URL}logo.svg`}
          alt="อบจ.ชลบุรี"
          className="h-20 w-20 object-contain flex-shrink-0 drop-shadow-lg"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="min-w-0">
          <p className="text-3xl font-extrabold text-white leading-tight truncate drop-shadow">
            โครงการพัฒนาศักยภาพด้านความปลอดภัยฯ จังหวัดชลบุรี
          </p>
          <p className="text-xl font-extrabold text-green-300 leading-tight truncate hidden md:block">
            ระบบฐานข้อมูลเพื่อการเข้าถึง Data Integration and End Users
          </p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Accessibility toolbar */}
        <div className="hidden sm:block">
          <AccessibilityToolbar />
        </div>

        {/* Date + Time */}
        <div className="hidden sm:flex items-center gap-2 bg-navy-800 border border-navy-600 rounded-lg px-3 py-1.5">
          <span className="text-lg font-bold text-white">{dateStr}</span>
          <span className="text-navy-400">|</span>
          <span className="text-lg font-bold text-white">{timeStr}</span>
        </div>

        {user ? (
          <>
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            ref={notifBtnRef}
            onClick={() => { setShowNotif(!showNotif); setShowUser(false); }}
            aria-label={unackCount > 0 ? `การแจ้งเตือน ${unackCount} รายการ` : 'การแจ้งเตือน'}
            aria-haspopup="true"
            aria-expanded={showNotif}
            className="relative p-2 hover:bg-navy-600 rounded-lg transition-colors group"
          >
            <Bell size={26} className={`transition-colors ${unackCount > 0 ? 'text-orange-400 animate-bounce' : 'text-navy-200 group-hover:text-orange-400'}`} />
            {unackCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
                {unackCount}
              </span>
            )}
          </button>

          {showNotif && isCitizen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl w-96 z-[1100] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-100">
                <div className="flex items-center gap-2">
                  <FileSearch size={16} className="text-navy-500" />
                  <span className="text-sm font-bold text-gray-900">สถานะคำขอดูข้อมูลกล้อง CCTV</span>
                </div>
                <span className="bg-navy-700 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unackCount} รายการ
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto">
                {myRequests.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-gray-400">
                    <CheckCircle size={32} className="text-green-400 mb-2" />
                    <p className="text-sm">ยังไม่มีคำขอ</p>
                  </div>
                ) : (
                  myRequests.map(req => (
                    <button
                      key={req.id}
                      onClick={() => { setShowNotif(false); navigate('/portal'); }}
                      className="w-full text-left flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        <FileSearch size={18} className="text-navy-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-gray-900 truncate">คำขอ {req.reqNo}</p>
                          <StatusBadge status={req.status} />
                        </div>
                        <p className="text-xs text-gray-500 truncate">{req.cameraId} · {req.cameraLocation}</p>
                        <p className="text-xs text-gray-500 mt-0.5">อัปเดตล่าสุด {timeAgo(latestActivity(req))}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <button
                onClick={() => { setShowNotif(false); navigate('/portal'); }}
                className="w-full px-4 py-2 text-center text-xs font-bold text-navy-500 hover:bg-gray-50 border-t border-gray-100 transition-colors"
              >
                ดูคำขอทั้งหมด
              </button>
            </div>
          )}

          {showNotif && !isCitizen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl w-80 z-[1100] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-orange-50 border-b border-orange-100">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-orange-500" />
                  <span className="text-sm font-bold text-gray-900">การแจ้งเตือน</span>
                </div>
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unackCount} รายการ
                </span>
              </div>

              {/* Cameras reported for inspection (admin only) */}
              {repairReports.length > 0 && (
                <div className="border-b border-amber-100">
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-50">
                    <Wrench size={14} className="text-amber-600" />
                    <span className="text-xs font-bold text-amber-700">กล้องรอตรวจสอบ ({repairReports.length})</span>
                  </div>
                  {repairReports.slice(0, 5).map(rep => (
                    <button
                      key={`${rep.cameraId}-${rep.reportedAt}`}
                      onClick={() => { setShowNotif(false); navigate('/admin/repairs'); }}
                      className="w-full text-left flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-amber-50/60 transition-colors"
                    >
                      <Wrench size={18} className="mt-0.5 flex-shrink-0 text-amber-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {rep.cameraId} — {rep.note || 'ไม่ระบุอาการ'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">แจ้งโดย {rep.reportedBy} · {timeAgo(rep.reportedAt)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="max-h-72 overflow-y-auto">
                {unackEvents.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-gray-400">
                    <CheckCircle size={32} className="text-green-400 mb-2" />
                    <p className="text-sm">ไม่มีการแจ้งเตือน</p>
                  </div>
                ) : (
                  unackEvents.slice(0, 10).map(ev => {
                    const EvIcon = EVENT_TYPE_ICONS[ev.eventType] ?? AlertTriangle;
                    return (
                    <div key={ev.id} className="flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <div className="mt-0.5 flex-shrink-0">
                        <EvIcon size={18} className="animate-blink" style={{ color: EVENT_COLORS[ev.eventType] }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          <span style={{ color: EVENT_TEXT_COLORS[ev.eventType] }}>{EVENT_LABELS[ev.eventType]}</span>
                          {' — '}{ev.cameraId}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{ev.cameraName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{timeAgo(ev.timestamp)}</p>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>

              {unackEvents.length > 10 && (
                <div className="px-4 py-2 text-center text-xs text-gray-400 border-t border-gray-100">
                  และอีก {unackEvents.length - 10} รายการ
                </div>
              )}
            </div>
          )}
        </div>

        {/* User */}
        <div className="relative" ref={userRef}>
          <button
            ref={userBtnRef}
            onClick={() => setShowUser(!showUser)}
            aria-label={`เมนูผู้ใช้ ${user?.name ?? ''}`}
            aria-haspopup="true"
            aria-expanded={showUser}
            className="flex items-center gap-2 p-2 hover:bg-navy-600 rounded-lg transition-colors"
          >
            <CircleUser size={36} className="text-white flex-shrink-0" />
            <div className="text-left hidden sm:block">
              <p className="text-lg font-bold text-white leading-tight">{user?.name}</p>
              <p className="text-sm text-white">{ROLE_LABELS[user?.role ?? 'operator']}</p>
            </div>
            <ChevronDown size={18} className="text-navy-300" />
          </button>

          {showUser && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-48 z-[1100]">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={() => { logout(); setShowUser(false); }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} />
                ออกจากระบบ
              </button>
            </div>
          )}
        </div>
          </>
        ) : (
          /* Guest (public info pages): no bell, no user menu — just a login button */
          <Link
            to="/login"
            className="flex items-center gap-2 bg-white text-navy-700 text-lg font-bold px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <CircleUser size={22} />
            เข้าสู่ระบบ
          </Link>
        )}
      </div>
    </header>
  );
}
