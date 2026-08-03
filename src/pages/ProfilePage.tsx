import { useId, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Camera, CheckCircle2, KeyRound, UserCog } from 'lucide-react';
import { Layout, SkipLink } from '../components/Layout';
import { Navbar } from '../components/Navbar';
import { CitizenFooter, CitizenHero, ServiceMenuChips, ServiceSidebar } from '../components/CitizenPortalUI';
import { Modal } from '../components/Modal';
import { RoleBadge } from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import { savedUsers, saveUsers } from '../utils/userStorage';
import { findMemberById, saveMember } from '../utils/memberStorage';
import { logAudit } from '../utils/auditLog';
import { MEMBER_PURPOSE_OPTIONS, MEMBER_TYPE_OPTIONS, ROLE_LABELS } from '../types';
import type { CitizenMember, MemberType, User } from '../types';

const THAI_PROVINCES = [
  'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี',
  'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท', 'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง',
  'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม', 'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์',
  'นนทบุรี', 'นราธิวาส', 'น่าน', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 'ปราจีนบุรี',
  'ปัตตานี', 'พระนครศรีอยุธยา', 'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี',
  'เพชรบูรณ์', 'แพร่', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา',
  'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี', 'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ',
  'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ', 'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี',
  'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู',
  'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี',
];

const OTHER = 'อื่นๆ';
const MAX_PHOTO_BYTES = 50 * 1024 * 1024;
const isKnownPurpose = (p: string) => (MEMBER_PURPOSE_OPTIONS as readonly string[]).includes(p);

function Req() {
  return <span className="text-red-600" aria-hidden="true"> *</span>;
}

/* shared by both profile forms — validates size, then reads as data-URI */
function loadPhotoFile(file: File, onLoaded: (dataUrl: string) => void, onError: (msg: string) => void) {
  if (file.size > MAX_PHOTO_BYTES) {
    onError('ขนาดไฟล์ต้องไม่เกิน 50 MB');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => onLoaded(reader.result as string);
  reader.onerror = () => onError('ไม่สามารถอ่านไฟล์รูปภาพได้');
  reader.readAsDataURL(file);
}

function PhotoField({ picture, name, onChange, error }: { picture?: string; name: string; onChange: (file: File | undefined) => void; error: string }) {
  const inputId = useId();
  return (
    <div>
      <label htmlFor={inputId} className="label">รูปโปรไฟล์</label>
      <div className="flex items-center gap-4">
        {picture ? (
          <img src={picture} alt="รูปโปรไฟล์" className="w-20 h-20 rounded-full object-cover border border-gray-200" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-navy-700 text-white flex items-center justify-center text-2xl font-bold" aria-hidden="true">
            {name.charAt(0) || '?'}
          </div>
        )}
        <label htmlFor={inputId} className="flex items-center gap-2 border-2 border-dashed border-gray-300 hover:border-navy-500 rounded-xl px-4 py-2.5 cursor-pointer text-navy-700 font-bold">
          <Camera size={18} aria-hidden="true" /> เปลี่ยนรูปภาพ
          <input id={inputId} type="file" accept="image/*" className="hidden" onChange={e => onChange(e.target.files?.[0])} />
        </label>
      </div>
      <p className="text-sm text-gray-500 mt-1">ไฟล์ภาพขนาดไม่เกิน 50 MB</p>
      {error && <p role="alert" className="text-base text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function ChangePasswordModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const close = () => { setCurrent(''); setNext(''); setConfirm(''); setError(''); onClose(); };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (next.length < 8) { setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร'); return; }
    if (next !== confirm) { setError('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน'); return; }
    onSuccess();
    close();
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title="เปลี่ยนรหัสผ่าน" icon={<KeyRound size={20} className="text-white" />}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p role="alert" className="text-lg text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <div>
          <label htmlFor="pw-current" className="label">รหัสผ่านปัจจุบัน<Req /></label>
          <input id="pw-current" type="password" value={current} onChange={e => setCurrent(e.target.value)} className="input-field" required />
        </div>
        <div>
          <label htmlFor="pw-new" className="label">รหัสผ่านใหม่<Req /></label>
          <input id="pw-new" type="password" value={next} onChange={e => setNext(e.target.value)} className="input-field" required minLength={8} />
        </div>
        <div>
          <label htmlFor="pw-confirm" className="label">ยืนยันรหัสผ่านใหม่<Req /></label>
          <input id="pw-confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="input-field" required minLength={8} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={close} className="btn-secondary">ยกเลิก</button>
          <button type="submit" className="btn-primary">บันทึกรหัสผ่านใหม่</button>
        </div>
      </form>
    </Modal>
  );
}

function ProfileCardShell({ user, children }: { user: User; children: ReactNode }) {
  const [pwOpen, setPwOpen] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  return (
    <div className="card max-w-3xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-gray-900">ข้อมูลส่วนตัว</h2>
          <RoleBadge role={user.role} />
        </div>
        <button type="button" onClick={() => setPwOpen(true)} className="btn-secondary text-lg flex items-center gap-2">
          <KeyRound size={16} /> เปลี่ยนรหัสผ่าน
        </button>
      </div>

      {pwSuccess && (
        <p role="status" className="flex items-center gap-1.5 text-lg font-bold text-green-700 bg-green-50 px-3 py-2 rounded-lg mb-4">
          <CheckCircle2 size={18} /> เปลี่ยนรหัสผ่านเรียบร้อยแล้ว
        </p>
      )}

      {children}

      <ChangePasswordModal
        isOpen={pwOpen}
        onClose={() => setPwOpen(false)}
        onSuccess={() => {
          setPwSuccess(true);
          logAudit(user, 'edit', 'โปรไฟล์ส่วนตัว', 'เปลี่ยนรหัสผ่าน (จำลอง)');
        }}
      />
    </div>
  );
}

/* ---------- staff form: admin / operator / executive / police / localOfficer (User records) ---------- */

function StaffProfileForm({ user }: { user: User }) {
  const { updateUser } = useAuth();
  const record = savedUsers().find(u => u.id === user.id) ?? user;
  const [form, setForm] = useState({
    name: record.name, email: record.email, phone: record.phone ?? '',
    department: record.department ?? '', picture: record.picture ?? '',
  });
  const [photoError, setPhotoError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  const set = (patch: Partial<typeof form>) => { setSaved(false); setForm(f => ({ ...f, ...patch })); };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    setSaveError('');
    const updated: User = { ...record, name: form.name, email: form.email, phone: form.phone, department: form.department, picture: form.picture };
    try {
      saveUsers(savedUsers().map(u => (u.id === updated.id ? updated : u)));
    } catch {
      setSaveError('พื้นที่จัดเก็บข้อมูลเต็ม กรุณาลองใช้รูปภาพขนาดเล็กลง');
      return;
    }
    updateUser(updated);
    logAudit(updated, 'edit', 'โปรไฟล์ส่วนตัว', 'แก้ไขข้อมูลส่วนตัว');
    setSaved(true);
  };

  return (
    <ProfileCardShell user={user}>
      <form onSubmit={handleSave} className="space-y-4">
        <PhotoField
          picture={form.picture}
          name={form.name}
          error={photoError}
          onChange={file => {
            setPhotoError('');
            if (!file) return;
            loadPhotoFile(file, dataUrl => set({ picture: dataUrl }), setPhotoError);
          }}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="p-username" className="label">Username</label>
            <input id="p-username" type="text" value={record.username} readOnly className="input-field bg-gray-100 text-gray-500" />
          </div>
          <div>
            <label htmlFor="p-role" className="label">บทบาท</label>
            <input id="p-role" type="text" value={ROLE_LABELS[record.role]} readOnly className="input-field bg-gray-100 text-gray-500" />
          </div>
        </div>

        <div>
          <label htmlFor="p-name" className="label">ชื่อ-นามสกุล<Req /></label>
          <input id="p-name" type="text" value={form.name} onChange={e => set({ name: e.target.value })} className="input-field" required />
        </div>

        <div>
          <label htmlFor="p-email" className="label">อีเมล<Req /></label>
          <input id="p-email" type="email" value={form.email} onChange={e => set({ email: e.target.value })} className="input-field" required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="p-phone" className="label">เบอร์โทรศัพท์</label>
            <input id="p-phone" type="tel" value={form.phone} onChange={e => set({ phone: e.target.value })} className="input-field" />
          </div>
          <div>
            <label htmlFor="p-department" className="label">แผนก/หน่วยงาน/สังกัด</label>
            <input id="p-department" type="text" value={form.department} onChange={e => set({ department: e.target.value })} className="input-field" />
          </div>
        </div>

        {saveError && <p role="alert" className="text-lg text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          {saved && (
            <span role="status" className="flex items-center gap-1.5 text-lg font-bold text-green-700">
              <CheckCircle2 size={18} /> บันทึกแล้ว
            </span>
          )}
          <button type="submit" className="btn-primary text-lg">บันทึกข้อมูล</button>
        </div>
      </form>
    </ProfileCardShell>
  );
}

/* ---------- citizen form: role === 'citizen' (CitizenMember records) ---------- */

function CitizenProfileForm({ user }: { user: User }) {
  const { updateUser } = useAuth();
  const record = findMemberById(user.id);

  if (!record) {
    return (
      <div className="card max-w-3xl">
        <p className="text-lg text-gray-600">ไม่พบข้อมูลการสมัครสมาชิกของท่าน กรุณาติดต่อเจ้าหน้าที่</p>
      </div>
    );
  }

  return <CitizenProfileFormBody user={user} record={record} updateUser={updateUser} />;
}

function CitizenProfileFormBody({ user, record, updateUser }: { user: User; record: CitizenMember; updateUser: (u: User) => void }) {
  const emailReadOnly = record.authType === 'google';
  const isForeigner = record.authType === 'google';
  const [form, setForm] = useState({
    name: record.name, email: record.email, phone: record.phone, address: record.address,
    province: record.province, postalCode: record.postalCode, memberType: record.memberType,
    purpose: isKnownPurpose(record.purpose) ? record.purpose : OTHER,
    purposeOther: isKnownPurpose(record.purpose) ? '' : record.purpose,
    nationality: record.nationality ?? '', picture: record.picture ?? '',
  });
  const [photoError, setPhotoError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  const set = (patch: Partial<typeof form>) => { setSaved(false); setForm(f => ({ ...f, ...patch })); };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    setSaveError('');
    const updated: CitizenMember = {
      ...record,
      name: form.name,
      email: emailReadOnly ? record.email : form.email,
      phone: form.phone,
      address: form.address,
      province: form.province,
      postalCode: form.postalCode,
      memberType: form.memberType,
      purpose: form.purpose === OTHER && form.purposeOther ? `อื่นๆ (${form.purposeOther})` : form.purpose,
      nationality: isForeigner ? form.nationality : record.nationality,
      picture: form.picture,
    };
    try {
      saveMember(updated);
    } catch {
      setSaveError('พื้นที่จัดเก็บข้อมูลเต็ม กรุณาลองใช้รูปภาพขนาดเล็กลง');
      return;
    }
    const sessionUser: User = {
      ...user, name: updated.name, email: updated.email, username: updated.email, picture: updated.picture,
    };
    updateUser(sessionUser);
    logAudit(sessionUser, 'edit', 'โปรไฟล์ส่วนตัว', 'แก้ไขข้อมูลส่วนตัว');
    setSaved(true);
  };

  return (
    <ProfileCardShell user={user}>
      <form onSubmit={handleSave} className="space-y-4">
        <PhotoField
          picture={form.picture}
          name={form.name}
          error={photoError}
          onChange={file => {
            setPhotoError('');
            if (!file) return;
            loadPhotoFile(file, dataUrl => set({ picture: dataUrl }), setPhotoError);
          }}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="p-idnum" className="label">{isForeigner ? 'เลขที่หนังสือเดินทาง' : 'เลขประจำตัวประชาชน'}</label>
            <input id="p-idnum" type="text" value={isForeigner ? (record.passportNumber ?? '') : (record.nationalId ?? '')} readOnly className="input-field bg-gray-100 text-gray-500 font-mono" />
          </div>
          <div>
            <label htmlFor="p-registered" className="label">วันที่สมัครสมาชิก</label>
            <input id="p-registered" type="text" value={new Date(record.registeredAt).toLocaleDateString('th-TH')} readOnly className="input-field bg-gray-100 text-gray-500" />
          </div>
        </div>

        <div>
          <label htmlFor="p-name" className="label">ชื่อ-นามสกุล<Req /></label>
          <input id="p-name" type="text" value={form.name} onChange={e => set({ name: e.target.value })} className="input-field" required />
        </div>

        <div>
          <label htmlFor="p-email" className="label">อีเมล{!emailReadOnly && <Req />}</label>
          <input
            id="p-email" type="email" value={form.email}
            onChange={e => set({ email: e.target.value })}
            readOnly={emailReadOnly}
            className={`input-field ${emailReadOnly ? 'bg-gray-100 text-gray-500' : ''}`}
            required={!emailReadOnly}
          />
          {emailReadOnly && <p className="text-sm text-gray-500 mt-1">ใช้สำหรับเข้าสู่ระบบด้วย Google จึงแก้ไขไม่ได้</p>}
        </div>

        {isForeigner && (
          <div>
            <label htmlFor="p-nationality" className="label">สัญชาติ<Req /></label>
            <input id="p-nationality" type="text" value={form.nationality} onChange={e => set({ nationality: e.target.value })} className="input-field" required />
          </div>
        )}

        <div>
          <label htmlFor="p-address" className="label">ที่อยู่<Req /></label>
          <textarea id="p-address" value={form.address} onChange={e => set({ address: e.target.value })} rows={2} className="input-field" required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="p-province" className="label">จังหวัด<Req /></label>
            <select id="p-province" value={form.province} onChange={e => set({ province: e.target.value })} className="input-field" required>
              {THAI_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="p-postal" className="label">รหัสไปรษณีย์<Req /></label>
            <input id="p-postal" type="text" inputMode="numeric" pattern="[0-9]{5}" title="รหัสไปรษณีย์ 5 หลัก" value={form.postalCode} onChange={e => set({ postalCode: e.target.value })} className="input-field" required />
          </div>
        </div>

        <div>
          <label htmlFor="p-phone" className="label">เบอร์โทรศัพท์มือถือ<Req /></label>
          <input id="p-phone" type="tel" value={form.phone} onChange={e => set({ phone: e.target.value })} className="input-field" required />
        </div>

        <div>
          <label htmlFor="p-type" className="label">ประเภทผู้ใช้งาน<Req /></label>
          <select id="p-type" value={form.memberType} onChange={e => set({ memberType: e.target.value as MemberType })} className="input-field" required>
            {MEMBER_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="p-purpose" className="label">วัตถุประสงค์การใช้งาน<Req /></label>
          <select id="p-purpose" value={form.purpose} onChange={e => set({ purpose: e.target.value })} className="input-field" required>
            {MEMBER_PURPOSE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {form.purpose === OTHER && (
          <div>
            <label htmlFor="p-purpose-other" className="label">โปรดระบุวัตถุประสงค์<Req /></label>
            <input id="p-purpose-other" type="text" value={form.purposeOther} onChange={e => set({ purposeOther: e.target.value })} className="input-field" required />
          </div>
        )}

        {saveError && <p role="alert" className="text-lg text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          {saved && (
            <span role="status" className="flex items-center gap-1.5 text-lg font-bold text-green-700">
              <CheckCircle2 size={18} /> บันทึกแล้ว
            </span>
          )}
          <button type="submit" className="btn-primary text-lg">บันทึกข้อมูล</button>
        </div>
      </form>
    </ProfileCardShell>
  );
}

/* ---------- shells ---------- */

function CitizenShellView({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col">
      <SkipLink />
      <Navbar />
      <CitizenHero title="โปรไฟล์ของฉัน" />
      <div className="flex-1 w-full max-w-[1400px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-5 items-start">
        <div className="lg:hidden"><ServiceMenuChips /></div>
        <aside className="hidden lg:block"><ServiceSidebar /></aside>
        <main id="main-content" tabIndex={-1} className="min-w-0 focus:outline-none">
          {children}
        </main>
      </div>
      <CitizenFooter />
    </div>
  );
}

export function ProfilePage() {
  const { user, isCitizen, isPolice, isLocalOfficer } = useAuth();
  if (!user) return null;

  if (isCitizen) {
    return (
      <CitizenShellView>
        <CitizenProfileForm user={user} />
      </CitizenShellView>
    );
  }

  if (isPolice || isLocalOfficer) {
    return (
      <CitizenShellView>
        <StaffProfileForm user={user} />
      </CitizenShellView>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col h-full">
        <div className="bg-blue-50 border-b-2 border-blue-100 px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-navy-700 rounded-xl flex items-center justify-center">
              <UserCog size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-navy-700">โปรไฟล์ของฉัน</h1>
              <p className="text-sm text-gray-600 mt-0.5">ข้อมูลส่วนตัวและการเข้าสู่ระบบ</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-5">
          <StaffProfileForm user={user} />
        </div>
      </div>
    </Layout>
  );
}
