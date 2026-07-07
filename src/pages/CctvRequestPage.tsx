import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, Calendar, CheckCircle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  FileSearch, FileText, HelpCircle, Home, Lock, LogOut, MapPin, Paperclip, Phone,
  Search, ShieldCheck, Target, Trash2, Upload, User as UserIcon, Video,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import camerasData from '../data/cameras.json';
import type { Camera } from '../types';
import { formatThaiDate } from '../utils/formatDate';

const cameras = camerasData as Camera[];
const locations = [...new Set(cameras.filter(c => c.status === 'Online').map(c => c.location))];

const WIZARD_STEPS = ['กรอกข้อมูลคำขอ', 'อัปโหลดเอกสาร', 'ตรวจสอบข้อมูล', 'ยืนยันคำขอ', 'เสร็จสิ้น'];

const PURPOSES = [
  'อุบัติเหตุจราจร',
  'ทรัพย์สินสูญหาย / ถูกโจรกรรม',
  'เหตุทะเลาะวิวาท / ทำร้ายร่างกาย',
  'ประกอบหลักฐานทางคดี / กฎหมาย',
  'เคลมประกันภัย',
  'อื่นๆ',
];

interface RequestForm {
  purpose: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  detail: string;
  reason: string;
}

const EMPTY_FORM: RequestForm = { purpose: '', date: '', startTime: '', endTime: '', location: '', detail: '', reason: '' };

type DocKey = 'idCard' | 'policeReport' | 'other';

const DOC_SLOTS: { key: DocKey; label: string; required: boolean; hint: string }[] = [
  { key: 'idCard', label: 'สำเนาบัตรประจำตัวประชาชน', required: true, hint: 'พร้อมรับรองสำเนาถูกต้อง (ไฟล์ PDF, JPG หรือ PNG)' },
  { key: 'policeReport', label: 'ใบแจ้งความ / บันทึกประจำวัน (ถ้ามี)', required: false, hint: 'กรณีขอข้อมูลประกอบคดีความ' },
  { key: 'other', label: 'เอกสารประกอบอื่นๆ (ถ้ามี)', required: false, hint: 'เช่น เอกสารเคลมประกัน หนังสือมอบอำนาจ' },
];

type Docs = Partial<Record<DocKey, string>>;

/* ---------- Header (white, per mockup) ---------- */
function PortalHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUser, setShowUser] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm relative z-20">
      <div className="max-w-[1400px] mx-auto px-4 h-24 flex items-center gap-4">
        <img
          src={`${import.meta.env.BASE_URL}logo-obcj.png`}
          alt="อบจ.ชลบุรี"
          className="h-16 w-16 object-contain flex-shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="min-w-0">
          <p className="text-2xl font-extrabold text-navy-700 leading-tight truncate">องค์การบริหารส่วนจังหวัดชลบุรี</p>
          <p className="text-lg text-gray-500 leading-tight truncate">ระบบฐานข้อมูลเพื่อการเข้าถึง (Data Integration and End Users)</p>
        </div>

        <Link
          to="/portal"
          className="hidden md:flex items-center gap-2 border border-navy-500 text-navy-700 font-bold text-xl px-5 py-2 rounded-xl hover:bg-navy-50 transition-colors flex-shrink-0"
        >
          <Home size={22} /> เมนูหลัก
        </Link>

        <div className="flex-1" />

        <Link to="/portal" className="hidden lg:flex items-center gap-2 text-xl font-bold text-gray-700 hover:text-navy-700 transition-colors flex-shrink-0">
          <Search size={22} /> ตรวจสอบคำขอ
        </Link>
        <a href="tel:038398333" className="hidden lg:flex items-center gap-2 text-xl font-bold text-gray-700 hover:text-navy-700 transition-colors flex-shrink-0">
          <Phone size={22} /> ติดต่อเรา
        </a>

        {/* User */}
        <div className="relative flex-shrink-0">
          <button onClick={() => setShowUser(v => !v)} className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-50 transition-colors">
            <div className="w-11 h-11 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-2xl font-bold">
              {user?.name?.charAt(0) ?? <UserIcon size={22} />}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xl font-bold text-gray-800 leading-tight">{user?.name}</p>
              <p className="text-base text-gray-500 leading-tight">{user?.email}</p>
            </div>
            <ChevronDown size={18} className="text-gray-400" />
          </button>
          {showUser && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-56 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-lg font-bold text-gray-900">{user?.name}</p>
                <p className="text-base text-gray-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="flex items-center gap-2 w-full px-4 py-2 text-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={18} /> ออกจากระบบ
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ---------- Hero banner + horizontal stepper ---------- */
function HeroBanner({ step }: { step: number }) {
  return (
    <div className="relative bg-navy-700 overflow-hidden">
      <div
        className="absolute inset-0 opacity-60 bg-cover bg-center"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}background01.png)` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-navy-700/95 via-navy-700/70 to-navy-500/30" />
      <div className="relative max-w-[1400px] mx-auto px-4 py-8 flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-5xl font-extrabold text-white drop-shadow mb-2">ยื่นคำขอเข้าดูข้อมูลกล้อง CCTV</h1>
          <div className="flex items-center gap-2 text-xl text-blue-100">
            <Link to="/portal" className="hover:text-white transition-colors">หน้าหลัก</Link>
            <ChevronRight size={18} />
            <span className="text-white font-bold">ยื่นคำขอเข้าดูข้อมูลกล้อง CCTV</span>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-start flex-shrink-0">
          {WIZARD_STEPS.map((label, i) => {
            const n = i + 1;
            const isActive = n === step;
            const isDone = n < step;
            return (
              <div key={label} className="flex items-start">
                {i > 0 && <div className="w-8 sm:w-14 border-t-2 border-dashed border-blue-300/70 mt-5 mx-1" />}
                <div className="flex flex-col items-center w-20 sm:w-24">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold border-2 transition-colors ${
                    isActive ? 'bg-white text-navy-700 border-white shadow-lg' :
                    isDone ? 'bg-green-500 text-white border-green-400' :
                    'bg-transparent text-white border-blue-300/70'
                  }`}>
                    {isDone ? '✓' : n}
                  </div>
                  <span className={`mt-1.5 text-center text-base leading-tight ${isActive ? 'text-white font-bold' : 'text-blue-100'}`}>
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- Left sidebar ---------- */
function ServiceSidebar() {
  const menu = [
    { icon: Video, label: 'ยื่นคำขอเข้าดูข้อมูลกล้อง CCTV', active: true },
    { icon: FileSearch, label: 'ตรวจสอบสถานะคำขอ', active: false },
    { icon: BookOpen, label: 'คู่มือการใช้งาน', active: false },
    { icon: HelpCircle, label: 'คำถามที่พบบ่อย', active: false },
  ];
  return (
    <div className="space-y-4">
      <div className="card p-0 overflow-hidden">
        <h3 className="text-2xl font-bold text-navy-700 px-4 py-3 border-b border-gray-100">บริการประชาชน</h3>
        <nav>
          {menu.map(({ icon: Icon, label, active }) => (
            <button
              key={label}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left text-xl transition-colors border-l-4 ${
                active
                  ? 'bg-navy-50 border-navy-700 text-navy-700 font-bold'
                  : 'border-transparent text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={24} className="flex-shrink-0" />
              <span className="leading-tight">{label}</span>
            </button>
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
            <p className="text-2xl font-extrabold text-navy-700 leading-tight">038-398-333</p>
            <p className="text-lg text-gray-500 leading-tight">จันทร์ - ศุกร์ 08:30 - 16:30 น.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Right column ---------- */
function SummaryCard({ form, docs }: { form: RequestForm; docs: Docs }) {
  const { user } = useAuth();
  const dateStr = form.date
    ? `${formatThaiDate(form.date)}${form.startTime ? ` ${form.startTime}` : ''}${form.endTime ? ` - ${form.endTime} น.` : ''}`
    : '-';
  const docNames = Object.values(docs).filter(Boolean);
  const items = [
    { icon: UserIcon, label: 'ผู้ยื่นคำขอ', value: user ? `${user.name}\n${user.email}` : '-' },
    { icon: Target, label: 'วัตถุประสงค์', value: form.purpose || '-' },
    { icon: Calendar, label: 'วันที่และเวลา', value: dateStr },
    { icon: MapPin, label: 'สถานที่เกิดเหตุ', value: form.location || '-' },
    { icon: Paperclip, label: 'เอกสารแนบ', value: docNames.length ? `${docNames.length} ไฟล์` : '-' },
  ];
  return (
    <div className="card">
      <h3 className="text-2xl font-bold text-navy-700 mb-3">สรุปคำขอ</h3>
      <div className="space-y-4">
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-navy-50 text-navy-700 flex items-center justify-center flex-shrink-0">
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-lg text-gray-500 leading-tight">{label}</p>
              <p className="text-xl font-bold text-gray-800 leading-snug whitespace-pre-line break-words">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecurityCard() {
  return (
    <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg bg-navy-700 text-white flex items-center justify-center flex-shrink-0">
        <Lock size={20} />
      </div>
      <div>
        <p className="text-xl font-bold text-navy-700 leading-tight mb-1">ข้อมูลของคุณปลอดภัย</p>
        <p className="text-lg text-gray-600 leading-snug">
          ระบบรักษาความปลอดภัยตามมาตรฐานสากล ข้อมูลจะถูกเข้ารหัสและใช้เพื่อวัตถุประสงค์ในการดำเนินการตามคำขอเท่านั้น
        </p>
      </div>
    </div>
  );
}

function StepsCard({ step }: { step: number }) {
  const steps = ['กรอกข้อมูลคำขอ', 'อัปโหลดเอกสารประกอบ', 'ตรวจสอบและยืนยันข้อมูล', 'เสร็จสิ้นการยื่นคำขอ'];
  // wizard steps 3 (review) and 4 (confirm) map to display step 3
  const current = step <= 2 ? step : step === 5 ? 4 : 3;
  return (
    <div className="card">
      <h3 className="text-2xl font-bold text-navy-700 mb-3">ขั้นตอนการยื่นคำขอ</h3>
      <div className="space-y-1">
        {steps.map((label, i) => {
          const n = i + 1;
          const isActive = n === current;
          const isDone = n < current;
          return (
            <div key={label} className="flex items-stretch gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 ${
                  isDone ? 'bg-green-500 text-white' : isActive ? 'bg-navy-700 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {isDone ? '✓' : n}
                </div>
                {i < steps.length - 1 && <div className="w-0.5 flex-1 min-h-[12px] bg-gray-200 my-0.5" />}
              </div>
              <p className={`text-xl pt-1 pb-2 leading-tight ${
                isActive ? 'text-navy-700 font-bold bg-navy-50 rounded-lg px-3 -ml-1 flex-1' : isDone ? 'text-green-700' : 'text-gray-400'
              }`}>
                {label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Step 1: request form ---------- */
function Step1Form({ form, setForm, onNext, onCancel }: {
  form: RequestForm;
  setForm: React.Dispatch<React.SetStateAction<RequestForm>>;
  onNext: () => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const [errors, setErrors] = useState<Partial<Record<keyof RequestForm, string>>>({});

  const validate = () => {
    const e: Partial<Record<keyof RequestForm, string>> = {};
    if (!form.purpose) e.purpose = 'กรุณาเลือกวัตถุประสงค์';
    if (!form.date) e.date = 'กรุณาเลือกวันที่';
    if (!form.startTime || !form.endTime) e.startTime = 'กรุณาระบุช่วงเวลาให้ครบถ้วน';
    if (!form.location) e.location = 'กรุณาเลือกสถานที่เกิดเหตุ';
    if (!form.reason.trim()) e.reason = 'กรุณาระบุเหตุผลประกอบการขอข้อมูล';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const set = (key: keyof RequestForm, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
    // the date/time trio shares one error line — clear it together
    const isDateTime = key === 'date' || key === 'startTime' || key === 'endTime';
    setErrors(e => ({ ...e, [key]: undefined, ...(isDateTime ? { date: undefined, startTime: undefined } : {}) }));
  };

  return (
    <div className="card p-6 space-y-6">
      {/* 1. Requester (Google OAuth verified) */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-3xl font-bold text-gray-800">1. ข้อมูลผู้ยื่นคำขอ</h2>
          <span className="bg-green-100 text-green-700 text-lg font-bold px-3 py-0.5 rounded-full">ยืนยันตัวตนแล้ว</span>
        </div>
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-3">
          <CheckCircle2 size={26} className="text-green-600 flex-shrink-0" />
          <p className="text-xl text-green-800 font-medium">ยืนยันตัวตนด้วยบัญชี Google (OAuth 2.0) เรียบร้อยแล้ว</p>
        </div>
        <div className="flex items-center gap-4 border border-gray-200 rounded-xl px-4 py-4">
          {/* Google G logo */}
          <svg viewBox="0 0 48 48" className="w-10 h-10 flex-shrink-0" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold text-gray-800 leading-tight">{user?.name}</p>
            <p className="text-lg text-gray-500 leading-tight truncate">{user?.email}</p>
          </div>
          <button className="text-xl text-navy-500 font-bold hover:text-navy-700 hover:underline flex-shrink-0">เปลี่ยนบัญชี</button>
        </div>
      </section>

      {/* 2. Request detail */}
      <section>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">2. รายละเอียดคำขอ</h2>
        <div className="space-y-4">
          <div>
            <label className="label">วัตถุประสงค์ในการขอดูข้อมูล <span className="text-red-500">*</span></label>
            <select value={form.purpose} onChange={e => set('purpose', e.target.value)} className="input-field">
              <option value="">เลือกวัตถุประสงค์</option>
              {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {errors.purpose && <p className="text-lg text-red-500 mt-1">{errors.purpose}</p>}
          </div>

          <div>
            <label className="label">วันที่และเวลาที่ต้องการดูข้อมูล <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr_auto_1fr] gap-2 items-center">
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="input-field" />
              <input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} className="input-field" />
              <span className="text-xl text-gray-600 text-center px-1">ถึง</span>
              <input type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} className="input-field" />
            </div>
            {(errors.date || errors.startTime) && <p className="text-lg text-red-500 mt-1">{errors.date ?? errors.startTime}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">สถานที่เกิดเหตุ <span className="text-red-500">*</span></label>
              <select value={form.location} onChange={e => set('location', e.target.value)} className="input-field">
                <option value="">เลือกพื้นที่</option>
                {locations.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              {errors.location && <p className="text-lg text-red-500 mt-1">{errors.location}</p>}
            </div>
            <div>
              <label className="label">ระบุรายละเอียดเพิ่มเติม (ถ้ามี)</label>
              <input
                value={form.detail}
                onChange={e => set('detail', e.target.value)}
                placeholder="เช่น ชื่อสถานที่ ถนน ซอย หรือจุดสังเกต"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="label">เหตุผลประกอบการขอข้อมูล <span className="text-red-500">*</span></label>
            <textarea
              value={form.reason}
              onChange={e => set('reason', e.target.value)}
              rows={4}
              placeholder="กรุณาระบุเหตุผลและความจำเป็นในการขอข้อมูลกล้อง CCTV อย่างละเอียด"
              className="input-field resize-none"
            />
            {errors.reason && <p className="text-lg text-red-500 mt-1">{errors.reason}</p>}
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <button onClick={onCancel} className="btn-secondary">ยกเลิก</button>
        <button onClick={() => { if (validate()) onNext(); }} className="btn-primary flex items-center gap-2">
          บันทึกและไปต่อ <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
}

/* ---------- Step 2: upload documents (mock) ---------- */
function Step2Upload({ docs, setDocs, onNext, onBack }: {
  docs: Docs;
  setDocs: React.Dispatch<React.SetStateAction<Docs>>;
  onNext: () => void;
  onBack: () => void;
}) {
  const [error, setError] = useState('');
  const inputRefs = useRef<Partial<Record<DocKey, HTMLInputElement | null>>>({});

  const handleFile = (key: DocKey, file: File | null) => {
    if (!file) return;
    setDocs(d => ({ ...d, [key]: file.name }));
    setError('');
  };

  return (
    <div className="card p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-800 mb-1">3. อัปโหลดเอกสารประกอบ</h2>
        <p className="text-xl text-gray-500">แนบเอกสารประกอบคำขอ (ไฟล์ตัวอย่างสำหรับการสาธิต จะไม่ถูกอัปโหลดจริง)</p>
      </div>

      <div className="space-y-4">
        {DOC_SLOTS.map(({ key, label, required, hint }) => {
          const fileName = docs[key];
          return (
            <div key={key}>
              <label className="label">
                {label} {required && <span className="text-red-500">*</span>}
              </label>
              {fileName ? (
                <div className="flex items-center gap-3 border border-green-200 bg-green-50 rounded-xl px-4 py-3">
                  <FileText size={26} className="text-green-600 flex-shrink-0" />
                  <p className="flex-1 text-xl font-medium text-gray-800 truncate">{fileName}</p>
                  <button
                    onClick={() => setDocs(d => ({ ...d, [key]: undefined }))}
                    className="text-red-500 hover:text-red-600 p-1"
                    title="ลบไฟล์"
                  >
                    <Trash2 size={22} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => inputRefs.current[key]?.click()}
                  className="w-full border-2 border-dashed border-gray-300 hover:border-navy-500 hover:bg-navy-50/50 rounded-xl px-4 py-6 flex flex-col items-center gap-2 transition-colors"
                >
                  <Upload size={30} className="text-navy-500" />
                  <p className="text-xl font-bold text-navy-700">คลิกเพื่อเลือกไฟล์</p>
                  <p className="text-lg text-gray-400">{hint}</p>
                </button>
              )}
              <input
                ref={el => { inputRefs.current[key] = el; }}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={e => handleFile(key, e.target.files?.[0] ?? null)}
              />
            </div>
          );
        })}
      </div>

      {error && <p className="text-xl text-red-500">{error}</p>}

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <button onClick={onBack} className="btn-secondary flex items-center gap-2">
          <ChevronLeft size={24} /> ย้อนกลับ
        </button>
        <button
          onClick={() => {
            if (!docs.idCard) { setError('กรุณาแนบสำเนาบัตรประจำตัวประชาชน'); return; }
            onNext();
          }}
          className="btn-primary flex items-center gap-2"
        >
          บันทึกและไปต่อ <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
}

/* ---------- Step 3: review ---------- */
function Step3Review({ form, docs, onNext, onBack, goToStep }: {
  form: RequestForm;
  docs: Docs;
  onNext: () => void;
  onBack: () => void;
  goToStep: (n: number) => void;
}) {
  const { user } = useAuth();
  const rows: [string, string][] = [
    ['วัตถุประสงค์', form.purpose],
    ['วันที่', form.date ? formatThaiDate(form.date) : '-'],
    ['ช่วงเวลา', `${form.startTime} - ${form.endTime} น.`],
    ['สถานที่เกิดเหตุ', form.location],
    ['รายละเอียดเพิ่มเติม', form.detail || '-'],
    ['เหตุผลประกอบ', form.reason],
  ];
  const attachedDocs = DOC_SLOTS.filter(s => docs[s.key]);

  return (
    <div className="card p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-800 mb-1">ตรวจสอบข้อมูลคำขอ</h2>
        <p className="text-xl text-gray-500">กรุณาตรวจสอบความถูกต้องของข้อมูลก่อนยืนยันคำขอ</p>
      </div>

      <section className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-navy-700 flex items-center gap-2"><UserIcon size={22} /> ข้อมูลผู้ยื่นคำขอ</h3>
        </div>
        <div className="px-4 py-3 space-y-1">
          <p className="text-2xl font-bold text-gray-800">{user?.name}</p>
          <p className="text-xl text-gray-500">{user?.email}</p>
          <p className="text-lg text-green-700 flex items-center gap-1"><ShieldCheck size={18} /> ยืนยันตัวตนด้วยบัญชี Google (OAuth 2.0)</p>
        </div>
      </section>

      <section className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-navy-700 flex items-center gap-2"><FileText size={22} /> รายละเอียดคำขอ</h3>
          <button onClick={() => goToStep(1)} className="text-xl text-navy-500 font-bold hover:underline">แก้ไข</button>
        </div>
        <div className="px-4 py-3">
          {rows.map(([k, v]) => (
            <div key={k} className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
              <span className="text-xl text-gray-500 w-44 flex-shrink-0">{k}</span>
              <span className="text-xl font-bold text-gray-800">{v}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-navy-700 flex items-center gap-2"><Paperclip size={22} /> เอกสารแนบ ({attachedDocs.length})</h3>
          <button onClick={() => goToStep(2)} className="text-xl text-navy-500 font-bold hover:underline">แก้ไข</button>
        </div>
        <div className="px-4 py-3 space-y-2">
          {attachedDocs.map(s => (
            <div key={s.key} className="flex items-center gap-2 text-xl text-gray-800">
              <FileText size={20} className="text-navy-500 flex-shrink-0" />
              <span className="text-gray-500">{s.label}:</span>
              <span className="font-bold truncate">{docs[s.key]}</span>
            </div>
          ))}
          {attachedDocs.length === 0 && <p className="text-xl text-gray-400">ไม่มีเอกสารแนบ</p>}
        </div>
      </section>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <button onClick={onBack} className="btn-secondary flex items-center gap-2">
          <ChevronLeft size={24} /> ย้อนกลับ
        </button>
        <button onClick={onNext} className="btn-primary flex items-center gap-2">
          ข้อมูลถูกต้อง ไปต่อ <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
}

/* ---------- Step 4: confirm (PDPA consent) ---------- */
function Step4Confirm({ onSubmit, onBack }: { onSubmit: () => void; onBack: () => void }) {
  const [consentPdpa, setConsentPdpa] = useState(false);
  const [consentTruth, setConsentTruth] = useState(false);
  const canSubmit = consentPdpa && consentTruth;

  return (
    <div className="card p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-800 mb-1">ยืนยันการยื่นคำขอ</h2>
        <p className="text-xl text-gray-500">โปรดอ่านและยอมรับเงื่อนไขก่อนส่งคำขอ</p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xl text-gray-600 leading-relaxed space-y-2">
        <p className="font-bold text-gray-800 flex items-center gap-2"><ShieldCheck size={22} className="text-navy-700" /> ข้อตกลงและเงื่อนไขการขอข้อมูลกล้อง CCTV</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>ข้อมูลภาพจากกล้อง CCTV จะถูกเปิดเผยเฉพาะส่วนที่เกี่ยวข้องกับเหตุการณ์ตามคำขอเท่านั้น</li>
          <li>ผู้ยื่นคำขอต้องไม่นำข้อมูลไปเผยแพร่ ทำซ้ำ หรือใช้เพื่อวัตถุประสงค์อื่นนอกเหนือจากที่ระบุไว้</li>
          <li>การเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลเป็นไปตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)</li>
          <li>เจ้าหน้าที่จะดำเนินการพิจารณาคำขอภายใน 3-5 วันทำการ และแจ้งผลผ่านอีเมลที่ลงทะเบียน</li>
        </ul>
      </div>

      <div className="space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={consentPdpa} onChange={e => setConsentPdpa(e.target.checked)} className="mt-1.5 w-5 h-5 accent-navy-700" />
          <span className="text-xl text-gray-700">
            ข้าพเจ้ายินยอมให้เก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลเพื่อการดำเนินการตามคำขอนี้ ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={consentTruth} onChange={e => setConsentTruth(e.target.checked)} className="mt-1.5 w-5 h-5 accent-navy-700" />
          <span className="text-xl text-gray-700">
            ข้าพเจ้าขอรับรองว่าข้อมูลที่กรอกทั้งหมดเป็นความจริงทุกประการ และยอมรับข้อตกลงเงื่อนไขการขอข้อมูลข้างต้น
          </span>
        </label>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <button onClick={onBack} className="btn-secondary flex items-center gap-2">
          <ChevronLeft size={24} /> ย้อนกลับ
        </button>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CheckCircle size={24} /> ยืนยันและส่งคำขอ
        </button>
      </div>
    </div>
  );
}

/* ---------- Step 5: done ---------- */
function Step5Done({ reqNo }: { reqNo: string }) {
  const navigate = useNavigate();
  return (
    <div className="card p-10 text-center">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
        <CheckCircle size={52} className="text-green-600" />
      </div>
      <h2 className="text-4xl font-extrabold text-navy-700 mb-2">ยื่นคำขอสำเร็จ!</h2>
      <p className="text-2xl text-gray-500 mb-1">หมายเลขคำขอของคุณ</p>
      <p className="text-5xl font-extrabold text-navy-700 mb-5">{reqNo}</p>
      <p className="text-2xl text-gray-600 mb-8 leading-relaxed">
        เจ้าหน้าที่จะดำเนินการพิจารณาคำขอภายใน 3-5 วันทำการ<br />
        ระบบจะแจ้งผลการพิจารณาผ่านอีเมลที่ท่านลงทะเบียนไว้
      </p>
      <div className="flex items-center justify-center gap-3">
        <button onClick={() => navigate('/portal')} className="btn-primary flex items-center gap-2">
          <FileSearch size={24} /> ตรวจสอบสถานะคำขอ
        </button>
        <button onClick={() => navigate('/portal')} className="btn-secondary flex items-center gap-2">
          <Home size={24} /> กลับหน้าหลัก
        </button>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export function CctvRequestPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<RequestForm>(EMPTY_FORM);
  const [docs, setDocs] = useState<Docs>({});
  const [reqNo, setReqNo] = useState('');

  const submit = () => {
    const yearBE = new Date().getFullYear() + 543;
    setReqNo(`REQ-${yearBE}-${String(Math.floor(1000 + Math.random() * 9000))}`);
    setStep(5);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToStep = (n: number) => {
    setStep(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const content = useMemo(() => {
    switch (step) {
      case 1:
        return <Step1Form form={form} setForm={setForm} onNext={() => goToStep(2)} onCancel={() => navigate('/portal')} />;
      case 2:
        return <Step2Upload docs={docs} setDocs={setDocs} onNext={() => goToStep(3)} onBack={() => goToStep(1)} />;
      case 3:
        return <Step3Review form={form} docs={docs} onNext={() => goToStep(4)} onBack={() => goToStep(2)} goToStep={goToStep} />;
      case 4:
        return <Step4Confirm onSubmit={submit} onBack={() => goToStep(3)} />;
      default:
        return <Step5Done reqNo={reqNo} />;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, form, docs, reqNo]);

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col">
      <PortalHeader />
      <HeroBanner step={step} />

      <div className="flex-1 w-full max-w-[1400px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_320px] gap-5 items-start">
        <aside className="hidden lg:block">
          <ServiceSidebar />
        </aside>

        <main className="min-w-0">{content}</main>

        <aside className="space-y-4">
          <SummaryCard form={form} docs={docs} />
          <SecurityCard />
          <StepsCard step={step} />
        </aside>
      </div>

      <footer className="bg-white border-t border-gray-200 py-4 mt-4">
        <p className="text-center text-lg text-gray-400">
          © {new Date().getFullYear() + 543} องค์การบริหารส่วนจังหวัดชลบุรี · ระบบฐานข้อมูลเพื่อการเข้าถึง (Data Integration and End Users)
        </p>
      </footer>
    </div>
  );
}
