import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import {
  Calendar, CheckCircle, CheckCircle2, ChevronLeft, ChevronRight,
  FileSearch, FileText, Home, Info, Lock, MapPin, Paperclip,
  ShieldCheck, Target, Trash2, Upload, User as UserIcon, X,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { SkipLink } from '../components/Layout';
import { CitizenFooter, CitizenHero, ServiceMenuChips, ServiceSidebar } from '../components/CitizenPortalUI';
import { useAuth } from '../context/AuthContext';
import type { CitizenRequest } from '../types';
import { formatThaiDate } from '../utils/formatDate';
import { pinIcon } from '../utils/mapPin';
import { addRequest } from '../utils/requestStorage';

const WIZARD_STEPS = ['กรอกข้อมูลคำขอ', 'อัปโหลดเอกสาร', 'ตรวจสอบข้อมูล', 'ยืนยันคำขอ', 'เสร็จสิ้น'];

const PURPOSES = [
  'เหตุอุบัติเหตุ / อุบัติเหตุจราจร',
  'ทรัพย์สินสูญหาย / ถูกโจรกรรม',
  'เหตุทะเลาะวิวาท / ทำร้ายร่างกาย',
  'ประกอบหลักฐานทางคดี / กฎหมาย',
  'เคลมประกันภัย',
  'อื่นๆ',
];

const MAX_REQUEST_HOURS = 6;
const MAX_BACK_DAYS = 7;

interface RequestForm {
  incidentLat: number | null;
  incidentLng: number | null;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  purpose: string;
  purposeOther: string;
  incidentLocation: string;
  reason: string;
  contactEmail: string;
}

const EMPTY_FORM: RequestForm = {
  incidentLat: null, incidentLng: null, startDate: '', startTime: '', endDate: '', endTime: '',
  purpose: '', purposeOther: '', incidentLocation: '', reason: '', contactEmail: '',
};

const OTHER_PURPOSE = 'อื่นๆ';

function purposeText(form: RequestForm): string {
  if (form.purpose === OTHER_PURPOSE) return form.purposeOther ? `อื่นๆ (${form.purposeOther})` : OTHER_PURPOSE;
  return form.purpose;
}

type DocKey = 'idCard' | 'policeReport' | 'other';

const DOC_SLOTS: { key: DocKey; label: string; required: boolean; hint: string }[] = [
  { key: 'idCard', label: 'สำเนาบัตรประจำตัวประชาชน', required: true, hint: 'พร้อมรับรองสำเนาถูกต้อง (ไฟล์ PDF, JPG หรือ PNG)' },
  { key: 'policeReport', label: 'ใบแจ้งความ / บันทึกประจำวัน (ถ้ามี)', required: false, hint: 'กรณีขอข้อมูลประกอบคดีความ' },
  { key: 'other', label: 'เอกสารประกอบอื่นๆ (ถ้ามี)', required: false, hint: 'เช่น เอกสารเคลมประกัน หนังสือมอบอำนาจ' },
];

type Docs = Partial<Record<DocKey, string>>;

/* ---------- Horizontal stepper (rendered inside CitizenHero) ---------- */
function WizardStepper({ step }: { step: number }) {
  return (
    <div className="flex items-start flex-shrink-0 max-w-full overflow-x-auto pb-1">
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
  );
}

/* ---------- Right column ---------- */
function formatRange(form: RequestForm): string {
  if (!form.startDate) return '-';
  const start = `${formatThaiDate(form.startDate)}${form.startTime ? ` ${form.startTime}` : ''}`;
  if (!form.endDate && !form.endTime) return start;
  const sameDay = form.endDate === form.startDate;
  const end = `${form.endDate && !sameDay ? `${formatThaiDate(form.endDate)} ` : ''}${form.endTime}`;
  return `${start} - ${end} น.`;
}

function SummaryCard({ form, docs }: { form: RequestForm; docs: Docs }) {
  const { user } = useAuth();
  const docNames = Object.values(docs).filter(Boolean);
  const items = [
    { icon: UserIcon, label: 'ผู้ยื่นคำขอ', value: user ? `${user.name}\n${user.email}` : '-' },
    { icon: MapPin, label: 'ตำแหน่งที่ปักหมุด', value: form.incidentLat != null && form.incidentLng != null ? `${form.incidentLat.toFixed(4)}, ${form.incidentLng.toFixed(4)}` : '-' },
    { icon: Target, label: 'วัตถุประสงค์', value: purposeText(form) || '-' },
    { icon: Calendar, label: 'วันที่และเวลา', value: formatRange(form) },
    { icon: MapPin, label: 'สถานที่เกิดเหตุ', value: form.incidentLocation || '-' },
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

/* Blank pin-drop map — no camera data ever reaches this component. Clicking
   anywhere moves the single incident pin; there is nothing to select or search. */
function PinPicker({ lat, lng, onPick }: { lat: number | null; lng: number | null; onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: e => onPick(e.latlng.lat, e.latlng.lng),
  });
  if (lat == null || lng == null) return null;
  return <Marker position={[lat, lng]} icon={pinIcon('#1B3A6B')} />;
}

type FormErrors = Partial<Record<keyof RequestForm | 'datetime', string>>;

function Step1Form({ form, setForm, onNext, onCancel }: {
  form: RequestForm;
  setForm: React.Dispatch<React.SetStateAction<RequestForm>>;
  onNext: () => void;
  onCancel: () => void;
}) {
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = () => {
    const e: FormErrors = {};
    if (form.incidentLat == null || form.incidentLng == null) e.incidentLat = 'กรุณาปักหมุดตำแหน่งที่เกิดเหตุบนแผนที่';
    if (!form.startDate || !form.startTime || !form.endDate || !form.endTime) {
      e.datetime = 'กรุณาระบุวันที่และเวลาให้ครบถ้วน';
    } else {
      const start = new Date(`${form.startDate}T${form.startTime}`);
      const end = new Date(`${form.endDate}T${form.endTime}`);
      const daysBack = (Date.now() - start.getTime()) / 86400000;
      if (end <= start) e.datetime = 'วันที่/เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น';
      else if (end.getTime() - start.getTime() > MAX_REQUEST_HOURS * 3600000) e.datetime = `ขอข้อมูลได้ไม่เกินครั้งละ ${MAX_REQUEST_HOURS} ชั่วโมง`;
      else if (daysBack > MAX_BACK_DAYS) e.datetime = `ขอข้อมูลย้อนหลังได้ไม่เกิน ${MAX_BACK_DAYS} วัน`;
    }
    if (!form.purpose) e.purpose = 'กรุณาเลือกวัตถุประสงค์';
    if (form.purpose === OTHER_PURPOSE && !form.purposeOther.trim()) e.purposeOther = 'กรุณาระบุวัตถุประสงค์ในการขอดูข้อมูล';
    if (!form.incidentLocation.trim()) e.incidentLocation = 'กรุณาระบุสถานที่เกิดเหตุ';
    if (!form.reason.trim()) e.reason = 'กรุณาระบุเหตุผลประกอบการขอข้อมูล';
    if (!form.contactEmail.trim()) e.contactEmail = 'กรุณาระบุอีเมลสำหรับติดต่อ';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) e.contactEmail = 'รูปแบบอีเมลไม่ถูกต้อง';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const set = (key: keyof RequestForm, value: string) => {
    setForm(f => ({
      ...f,
      [key]: value,
      ...(key === 'purpose' && value !== OTHER_PURPOSE ? { purposeOther: '' } : {}),
    }));
    // the date/time quartet shares one error line — clear it together
    const isDateTime = key === 'startDate' || key === 'startTime' || key === 'endDate' || key === 'endTime';
    setErrors(e => ({ ...e, [key]: undefined, ...(isDateTime ? { datetime: undefined } : {}) }));
  };

  const setPin = (lat: number, lng: number) => {
    setForm(f => ({ ...f, incidentLat: lat, incidentLng: lng }));
    setErrors(e => ({ ...e, incidentLat: undefined }));
  };
  const clearPin = () => setForm(f => ({ ...f, incidentLat: null, incidentLng: null }));

  return (
    <div className="card p-6 space-y-6">
      {/* 1. Request info */}
      <section>
        <h2 className="text-3xl font-bold text-gray-800 mb-3">1. ข้อมูลคำขอ</h2>
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle2 size={26} className="text-green-600 flex-shrink-0" />
          <p className="text-xl text-green-800 font-medium">ยืนยันตัวตนด้วย ThaID เรียบร้อยแล้ว</p>
        </div>
      </section>

      {/* 1.1 Incident pin — no camera locations are ever shown to citizens */}
      <section>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">1.1 ปักหมุดตำแหน่งที่เกิดเหตุ</h3>
        <p className="text-lg text-gray-500 mb-3">คลิกบนแผนที่เพื่อปักหมุด (คลิกใหม่เพื่อย้ายหมุด) เจ้าหน้าที่จะเป็นผู้พิจารณาเลือกกล้อง CCTV ที่เกี่ยวข้องให้</p>

        <div className="rounded-xl overflow-hidden border border-gray-200 h-[300px] relative z-0">
          <MapContainer center={[13.36, 100.98]} zoom={12} className="w-full h-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <PinPicker lat={form.incidentLat} lng={form.incidentLng} onPick={setPin} />
          </MapContainer>
        </div>

        <div className="mt-3">
          <span className="label">ตำแหน่งที่ปักหมุด <span className="text-red-500">*</span></span>
          <div className="flex gap-2">
            <div className="input-field flex items-center gap-2 flex-1 min-w-0">
              {form.incidentLat != null && form.incidentLng != null ? (
                <>
                  <MapPin size={22} className="text-navy-500 flex-shrink-0" />
                  <span className="font-bold text-gray-800">{form.incidentLat.toFixed(4)}, {form.incidentLng.toFixed(4)}</span>
                  <button onClick={clearPin} title="ล้างหมุด" aria-label="ล้างหมุด" className="ml-auto text-gray-500 hover:text-red-500 flex-shrink-0">
                    <X size={22} />
                  </button>
                </>
              ) : (
                <span className="text-gray-400">คลิกบนแผนที่เพื่อปักหมุด</span>
              )}
            </div>
          </div>
          {errors.incidentLat && <p role="alert" className="text-lg text-red-600 mt-1">{errors.incidentLat}</p>}
        </div>
      </section>

      {/* 1.2 Date & time range */}
      <section>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">1.2 ระบุวันที่และเวลาที่ต้องการ</h3>
        <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_auto_1fr_1fr] gap-2 items-end">
          <div>
            <label htmlFor="req-start-date" className="label">วันที่เริ่มต้น <span className="text-red-500">*</span></label>
            <input id="req-start-date" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className="input-field" />
          </div>
          <div>
            <label htmlFor="req-start-time" className="label">เวลาเริ่มต้น <span className="text-red-500">*</span></label>
            <input id="req-start-time" type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} className="input-field" />
          </div>
          <span className="hidden sm:block text-xl text-gray-600 text-center px-1 pb-2.5">ถึง</span>
          <div>
            <label htmlFor="req-end-date" className="label">วันที่สิ้นสุด <span className="text-red-500">*</span></label>
            <input id="req-end-date" type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className="input-field" />
          </div>
          <div>
            <label htmlFor="req-end-time" className="label">เวลาสิ้นสุด <span className="text-red-500">*</span></label>
            <input id="req-end-time" type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} className="input-field" />
          </div>
        </div>
        {errors.datetime && <p role="alert" className="text-lg text-red-600 mt-1">{errors.datetime}</p>}
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 text-navy-700 text-lg rounded-lg px-3 py-2 mt-2">
          <Info size={18} className="flex-shrink-0" />
          ช่วงเวลาที่สามารถขอข้อมูลได้ไม่เกิน {MAX_BACK_DAYS} วัน และไม่เกินครั้งละ {MAX_REQUEST_HOURS} ชั่วโมง
        </div>
      </section>

      {/* 1.3 Request detail */}
      <section>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">1.3 รายละเอียดคำขอ</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="req-purpose" className="label">วัตถุประสงค์ในการขอข้อมูล <span className="text-red-500">*</span></label>
              <select id="req-purpose" value={form.purpose} onChange={e => set('purpose', e.target.value)} className="input-field">
                <option value="">เลือกวัตถุประสงค์</option>
                {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {errors.purpose && <p role="alert" className="text-lg text-red-600 mt-1">{errors.purpose}</p>}
            </div>
            <div>
              <label htmlFor="req-incident-location" className="label">สถานที่เกิดเหตุ <span className="text-red-500">*</span></label>
              <input
                id="req-incident-location"
                value={form.incidentLocation}
                onChange={e => set('incidentLocation', e.target.value)}
                placeholder="ถ.บางแสนสาย 1 ใกล้แยกลงหาดวอน"
                className="input-field"
              />
              {errors.incidentLocation && <p role="alert" className="text-lg text-red-600 mt-1">{errors.incidentLocation}</p>}
            </div>
          </div>

          {form.purpose === OTHER_PURPOSE && (
            <div>
              <label htmlFor="req-purpose-other" className="label">โปรดระบุวัตถุประสงค์ <span className="text-red-500">*</span></label>
              <input
                id="req-purpose-other"
                value={form.purposeOther}
                onChange={e => set('purposeOther', e.target.value)}
                placeholder="ระบุวัตถุประสงค์ในการขอดูข้อมูลกล้อง CCTV"
                className="input-field"
              />
              {errors.purposeOther && <p role="alert" className="text-lg text-red-600 mt-1">{errors.purposeOther}</p>}
            </div>
          )}

          <div>
            <label htmlFor="req-reason" className="label">เหตุผลประกอบการขอข้อมูล <span className="text-red-500">*</span></label>
            <textarea
              id="req-reason"
              value={form.reason}
              onChange={e => set('reason', e.target.value)}
              rows={3}
              placeholder="ต้องการภาพจากกล้องวงจรปิดเพื่อใช้เป็นหลักฐานในการเคลมประกันภัย จากอุบัติเหตุรถชนกัน"
              className="input-field resize-none"
            />
            {errors.reason && <p role="alert" className="text-lg text-red-600 mt-1">{errors.reason}</p>}
          </div>

          <div className="sm:max-w-md">
            <label htmlFor="req-contact-email" className="label">อีเมลสำหรับติดต่อ <span className="text-red-500">*</span></label>
            <input
              id="req-contact-email"
              type="email"
              autoComplete="email"
              value={form.contactEmail}
              onChange={e => set('contactEmail', e.target.value)}
              placeholder="you@example.com"
              className="input-field"
            />
            {errors.contactEmail && <p role="alert" className="text-lg text-red-600 mt-1">{errors.contactEmail}</p>}
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
                    aria-label={`ลบไฟล์ ${fileName}`}
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

      {error && <p role="alert" className="text-xl text-red-600">{error}</p>}

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
    ['ตำแหน่งที่ปักหมุด', form.incidentLat != null && form.incidentLng != null ? `${form.incidentLat.toFixed(4)}, ${form.incidentLng.toFixed(4)}` : '-'],
    ['วันที่และเวลา', formatRange(form)],
    ['วัตถุประสงค์', purposeText(form)],
    ['สถานที่เกิดเหตุ', form.incidentLocation],
    ['เหตุผลประกอบ', form.reason],
    ['อีเมลสำหรับติดต่อ', form.contactEmail],
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
          <p className="text-lg text-green-700 flex items-center gap-1"><ShieldCheck size={18} /> ยืนยันตัวตนด้วย ThaID</p>
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
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<RequestForm>(() => ({ ...EMPTY_FORM, contactEmail: user?.email ?? '' }));
  const [docs, setDocs] = useState<Docs>({});
  const [reqNo, setReqNo] = useState('');

  const submit = () => {
    const yearBE = new Date().getFullYear() + 543;
    const newReqNo = `REQ-${yearBE}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const now = new Date().toISOString();
    const req: CitizenRequest = {
      id: `req-${Date.now()}`,
      reqNo: newReqNo,
      citizenName: user?.name ?? '',
      idCard: user?.nationalId ?? '',
      phone: user?.phone ?? '',
      email: form.contactEmail,
      incidentLat: form.incidentLat ?? 0,
      incidentLng: form.incidentLng ?? 0,
      incidentLocation: form.incidentLocation,
      assignedCameraIds: [],
      startDatetime: `${form.startDate}T${form.startTime}`,
      endDatetime: `${form.endDate}T${form.endTime}`,
      purpose: purposeText(form),
      description: form.reason,
      status: 'ใหม่',
      submittedAt: now,
      timeline: [
        { step: 'รับคำขอ', timestamp: now, completed: true },
        { step: 'ตรวจสอบข้อมูล', completed: false },
        { step: 'พิจารณาอนุมัติ', completed: false },
        { step: 'จัดเตรียมข้อมูล', completed: false },
        { step: 'ส่งข้อมูล', completed: false },
      ],
    };
    addRequest(req);
    setReqNo(newReqNo);
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
      <SkipLink />
      <Navbar />
      <CitizenHero title="ยื่นคำขอเข้าดูข้อมูลกล้อง CCTV">
        <WizardStepper step={step} />
      </CitizenHero>

      <div className="flex-1 w-full max-w-[1400px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_320px] gap-5 items-start">
        <div className="lg:hidden"><ServiceMenuChips active="request" /></div>
        <aside className="hidden lg:block">
          <ServiceSidebar active="request" />
        </aside>

        <main id="main-content" tabIndex={-1} className="min-w-0 focus:outline-none">{content}</main>

        <aside className="space-y-4">
          <SummaryCard form={form} docs={docs} />
          <SecurityCard />
          <StepsCard step={step} />
        </aside>
      </div>

      <CitizenFooter />
    </div>
  );
}
