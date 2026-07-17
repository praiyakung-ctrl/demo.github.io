import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Building2, ChevronRight, FileSearch, HelpCircle, Phone, Video } from 'lucide-react';
import { ORG_INFO } from '../data/orgInfo';

/* Shared UI for citizen-facing pages (CctvRequestPage, CitizenPortalPage):
   navy hero banner, service sidebar, footer — keeps both pages on one theme. */

export function CitizenHero({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="relative bg-navy-700 overflow-hidden">
      <div
        className="absolute inset-0 opacity-60 bg-cover bg-center"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}background01.webp)` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-navy-700/95 via-navy-700/70 to-navy-500/30" />
      <div className="relative max-w-[1400px] mx-auto px-4 py-8 flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-5xl font-extrabold text-white drop-shadow mb-2">{title}</h1>
          <div className="flex items-center gap-2 text-xl text-blue-100">
            <Link to="/portal" className="hover:text-white transition-colors">หน้าหลัก</Link>
            <ChevronRight size={18} />
            <span className="text-white font-bold">{title}</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

const MENU = [
  { key: 'request', icon: Video, label: 'ยื่นคำขอเข้าดูข้อมูลกล้อง CCTV', to: '/portal/request' },
  { key: 'status', icon: FileSearch, label: 'ตรวจสอบสถานะคำขอ', to: '/portal' },
  { key: 'manual', icon: BookOpen, label: 'คู่มือการใช้งาน', to: '/manual' },
  { key: 'faq', icon: HelpCircle, label: 'คำถามที่พบบ่อย', to: '/faq' },
  { key: 'about', icon: Building2, label: 'เกี่ยวกับ อบจ.ชลบุรี', to: '/about' },
] as const;

export type ServiceMenuKey = (typeof MENU)[number]['key'];

export function ServiceSidebar({ active }: { active: ServiceMenuKey }) {
  return (
    <div className="space-y-4">
      <div className="card p-0 overflow-hidden">
        <h3 className="text-2xl font-bold text-navy-700 px-4 py-3 border-b border-gray-100">บริการประชาชน</h3>
        <nav>
          {MENU.map(({ key, icon: Icon, label, to }) => (
            <Link
              key={key}
              to={to}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left text-xl transition-colors border-l-4 ${
                key === active
                  ? 'bg-navy-50 border-navy-700 text-navy-700 font-bold'
                  : 'border-transparent text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={24} className="flex-shrink-0" />
              <span className="leading-tight">{label}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="card">
        <h3 className="text-2xl font-bold text-navy-700 mb-1">ต้องการความช่วยเหลือ?</h3>
        <p className="text-lg text-gray-500 mb-3">ติดต่อเจ้าหน้าที่</p>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-navy-50 text-navy-700 flex items-center justify-center flex-shrink-0">
            <Phone size={24} />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-navy-700 leading-tight">{ORG_INFO.hotline}</p>
            <p className="text-lg text-gray-500 leading-tight">{ORG_INFO.officeHours}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Mobile replacement for ServiceSidebar (which is hidden below lg):
   a horizontally scrollable chip bar so every citizen page stays reachable. */
export function ServiceMenuChips({ active }: { active: ServiceMenuKey }) {
  return (
    <nav aria-label="บริการประชาชน" className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {MENU.map(({ key, icon: Icon, label, to }) => (
        <Link
          key={key}
          to={to}
          aria-current={key === active ? 'page' : undefined}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-lg font-bold whitespace-nowrap flex-shrink-0 border-2 transition-colors ${
            key === active
              ? 'bg-navy-700 border-navy-700 text-white'
              : 'bg-white border-gray-200 text-navy-700 hover:bg-gray-50'
          }`}
        >
          <Icon size={20} className="flex-shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function CitizenFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 py-4 mt-4">
      <p className="text-center text-lg text-gray-600">
        © {new Date().getFullYear() + 543} องค์การบริหารส่วนจังหวัดชลบุรี · ระบบฐานข้อมูลเพื่อการเข้าถึง (Data Integration and End Users)
      </p>
    </footer>
  );
}
