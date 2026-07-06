import { useState, useEffect } from 'react';
import { Bell, LogOut, ChevronDown, CircleUser, AlertTriangle, CheckCircle, Car, Crosshair, ParkingSquare, Waves, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS, EVENT_LABELS, EVENT_COLORS } from '../types';
import eventsData from '../data/events.json';
import type { CctvEvent } from '../types';
import { timeAgo } from '../utils/formatDate';

const allEvents = eventsData as CctvEvent[];

const EVENT_TYPE_ICONS = {
  normal:  CheckCircle,
  traffic: Car,
  gunshot: Crosshair,
  parking: ParkingSquare,
  flood:   Waves,
  crowd:   Users,
} as const;

export function Navbar() {
  const { user, logout } = useAuth();
  const [time, setTime] = useState(new Date());
  const [showUser, setShowUser] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  const unackEvents = allEvents.filter(e => !e.isAcknowledged);
  const unackCount = unackEvents.length;

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
          src="/logo-obcj.png"
          alt="อบจ.ชลบุรี"
          className="h-20 w-20 object-contain flex-shrink-0 drop-shadow-lg"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold text-white leading-tight truncate drop-shadow">
            โครงการพัฒนาศักยภาพด้านความปลอดภัยฯ จังหวัดชลบุรี
          </h1>
          <p className="text-xl font-extrabold text-green-300 leading-tight truncate hidden md:block">
            ระบบฐานข้อมูลเพื่อการเข้าถึง Data Integration and End Users
          </p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Date + Time */}
        <div className="hidden sm:flex items-center gap-2 bg-navy-800 border border-navy-600 rounded-lg px-3 py-1.5">
          <span className="text-lg font-bold text-white">{dateStr}</span>
          <span className="text-navy-400">|</span>
          <span className="text-lg font-bold text-white">{timeStr}</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotif(!showNotif); setShowUser(false); }}
            className="relative p-2 hover:bg-navy-600 rounded-lg transition-colors group"
          >
            <Bell size={26} className={`transition-colors ${unackCount > 0 ? 'text-orange-400 animate-bounce' : 'text-navy-200 group-hover:text-orange-400'}`} />
            {unackCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
                {unackCount}
              </span>
            )}
          </button>

          {showNotif && (
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
                          <span style={{ color: EVENT_COLORS[ev.eventType] }}>{EVENT_LABELS[ev.eventType]}</span>
                          {' — '}{ev.cameraId}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{ev.cameraName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{timeAgo(ev.timestamp)}</p>
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
        <div className="relative">
          <button
            onClick={() => setShowUser(!showUser)}
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
      </div>
    </header>
  );
}
