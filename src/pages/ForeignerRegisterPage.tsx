import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, ShieldCheck, Upload, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AccessibilityToolbar } from '../components/AccessibilityToolbar';
import { GoogleLoginPanel } from '../components/GoogleLoginPanel';
import type { GoogleProfile } from '../utils/googleAuth';
import { findMemberByEmail, saveMember } from '../utils/memberStorage';
import { MEMBER_PURPOSE_OPTIONS, MEMBER_TYPE_OPTIONS } from '../types';
import type { CitizenMember, MemberType } from '../types';
import { ORG_INFO } from '../data/orgInfo';

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

const COLLECTED_DATA = [
  'ชื่อ-นามสกุล และอีเมล จากบัญชี Google',
  'เลขที่หนังสือเดินทาง (พาสปอร์ต) และสัญชาติ',
  'ภาพสแกนหนังสือเดินทาง',
  'ที่อยู่ จังหวัด รหัสไปรษณีย์ และเบอร์โทรศัพท์ที่ท่านกรอกเพิ่มเติม',
  'ประเภทผู้ใช้งาน และวัตถุประสงค์การใช้งาน',
];

/* Red asterisk for required fields */
function Req() {
  return <span className="text-red-600" aria-hidden="true"> *</span>;
}

interface ProfileForm {
  name: string;
  email: string;
  passportNumber: string;
  nationality: string;
  address: string;
  province: string;
  postalCode: string;
  phone: string;
  memberType: MemberType | '';
  purpose: string;
  purposeOther: string;
  acceptTerms: boolean;
  acceptPdpa: boolean;
}

export function ForeignerRegisterPage() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [google, setGoogle] = useState<GoogleProfile | null>(null);
  const [passportScan, setPassportScan] = useState('');
  const [form, setForm] = useState<ProfileForm>({
    name: '', email: '', passportNumber: '', nationality: '',
    address: '', province: 'ชลบุรี', postalCode: '', phone: '',
    memberType: '', purpose: '', purposeOther: '',
    acceptTerms: false, acceptPdpa: false,
  });

  const set = (patch: Partial<ProfileForm>) => setForm(f => ({ ...f, ...patch }));

  const handleGoogleVerified = (profile: GoogleProfile) => {
    if (findMemberByEmail(profile.email)) {
      setAlreadyRegistered(true);
      return;
    }
    setGoogle(profile);
    set({ name: profile.name, email: profile.email });
  };

  const handlePassportScan = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPassportScan(reader.result as string);
    reader.readAsDataURL(file);
  };

  const canContinue = Boolean(google) && Boolean(passportScan);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!google || !passportScan || !form.memberType) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    const member: CitizenMember = {
      id: `member-${Date.now()}`,
      authType: 'google',
      email: form.email,
      name: form.name,
      picture: google.picture,
      passportNumber: form.passportNumber,
      nationality: form.nationality,
      passportScan,
      address: form.address,
      province: form.province,
      postalCode: form.postalCode,
      phone: form.phone,
      memberType: form.memberType,
      purpose: form.purpose === OTHER && form.purposeOther ? `อื่นๆ (${form.purposeOther})` : form.purpose,
      acceptedTerms: form.acceptTerms,
      acceptedPdpa: form.acceptPdpa,
      registeredAt: new Date().toISOString(),
    };
    saveMember(member);
    setSubmitting(false);
    setStep(3);
  };

  const handleEnter = () => {
    if (!google) return;
    loginWithGoogle(google);
    navigate('/portal', { replace: true });
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundImage: `linear-gradient(rgba(27,58,107,0.55), rgba(27,58,107,0.65)), url(${import.meta.env.BASE_URL}background01.webp)`, backgroundSize: 'cover', backgroundPosition: 'right center' }}>
      <div className="absolute top-3 right-3 z-10">
        <AccessibilityToolbar />
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-xl">
          <div className="text-center mb-6">
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="อบจ.ชลบุรี" className="h-24 w-24 mx-auto mb-3 object-contain" />
            <h1 className="text-white text-4xl font-bold">สมัครสมาชิกสำหรับชาวต่างชาติ</h1>
            <p className="text-blue-200 text-2xl">Registration for Foreign Nationals (Passport Holders)</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {step === 1 && !alreadyRegistered && (
              <>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <UserPlus size={36} className="text-navy-700" aria-hidden="true" />
                  <h2 className="text-3xl font-bold text-gray-900">เริ่มต้นสมัครสมาชิก</h2>
                </div>
                <p className="text-lg text-gray-600 mb-4">
                  ยืนยันตัวตนด้วยบัญชี Google (Gmail) ผ่าน OAuth 2.0 พร้อมแนบสแกนหนังสือเดินทาง (พาสปอร์ต)
                  จากนั้นกรอกข้อมูลเพิ่มเติมเพื่อใช้บริการขอข้อมูลภาพจากกล้อง CCTV
                </p>
                <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="flex items-center gap-2 text-lg font-semibold text-navy-700 mb-2">
                    <ShieldCheck size={20} aria-hidden="true" /> ข้อมูลที่ระบบจะเก็บรวบรวม
                  </p>
                  <ul className="list-disc pl-6 text-base text-gray-700 space-y-1">
                    {COLLECTED_DATA.map(item => <li key={item}>{item}</li>)}
                  </ul>
                </div>

                <GoogleLoginPanel showDemoShortcut onVerified={handleGoogleVerified} />

                <div className="mt-4">
                  <label className="label">แนบสแกนหนังสือเดินทาง (พาสปอร์ต)<Req /></label>
                  {passportScan ? (
                    <div className="flex items-center gap-3">
                      <img src={passportScan} alt="สแกนหนังสือเดินทาง" className="w-28 h-28 rounded-lg object-cover border border-gray-200" />
                      <button type="button" onClick={() => setPassportScan('')} className="text-base text-red-600 hover:underline font-medium">นำไฟล์ออก</button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 border-2 border-dashed border-gray-300 hover:border-navy-500 rounded-xl px-4 py-3 cursor-pointer text-navy-700 font-bold w-fit">
                      <Upload size={20} aria-hidden="true" /> แนบไฟล์สแกนพาสปอร์ต
                      <input type="file" accept="image/*" className="hidden" onChange={e => handlePassportScan(e.target.files?.[0])} />
                    </label>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!canContinue}
                  onClick={() => setStep(2)}
                  className="btn-primary w-full py-3 text-xl mt-5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  ถัดไป
                </button>
              </>
            )}

            {step === 1 && alreadyRegistered && (
              <div className="text-center py-4" role="alert">
                <CheckCircle2 size={48} className="text-green-600 mx-auto mb-3" aria-hidden="true" />
                <p className="text-xl font-semibold text-gray-900 mb-1">บัญชี Google นี้สมัครสมาชิกแล้ว</p>
                <p className="text-lg text-gray-600 mb-5">ท่านสามารถเข้าสู่ระบบด้วยปุ่ม "เข้าสู่ระบบด้วย Google" ได้ทันที</p>
                <Link to="/login" className="btn-primary inline-block w-full py-2.5 text-lg">ไปหน้าเข้าสู่ระบบ</Link>
              </div>
            )}

            {step === 2 && google && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900">กรอกข้อมูลสมาชิก</h2>

                {/* Google profile (readonly) */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-3">
                  <div className="flex items-center gap-3">
                    {google.picture ? (
                      <img src={google.picture} alt="รูปโปรไฟล์จาก Google" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-navy-700 text-white flex items-center justify-center text-xl font-bold" aria-hidden="true">
                        {form.name.charAt(0) || 'G'}
                      </div>
                    )}
                    <p className="text-lg font-semibold text-gray-700">ยืนยันตัวตนผ่าน Google แล้ว</p>
                  </div>
                  <div>
                    <label htmlFor="reg-email-ro" className="label">อีเมล (จาก Google)</label>
                    <input id="reg-email-ro" type="text" value={google.email} readOnly className="input-field bg-gray-100 text-gray-500" />
                  </div>
                  <div className="flex items-center gap-3">
                    <img src={passportScan} alt="สแกนหนังสือเดินทาง" className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                    <p className="text-base text-gray-600">แนบสแกนหนังสือเดินทางแล้ว</p>
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-name" className="label">ชื่อ-นามสกุล (ตามหนังสือเดินทาง)<Req /></label>
                  <input id="reg-name" type="text" value={form.name} onChange={e => set({ name: e.target.value })} placeholder="Full name as in passport" className="input-field" required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="reg-passport" className="label">เลขที่หนังสือเดินทาง<Req /></label>
                    <input id="reg-passport" type="text" value={form.passportNumber} onChange={e => set({ passportNumber: e.target.value })} placeholder="Passport No." className="input-field" required />
                  </div>
                  <div>
                    <label htmlFor="reg-nationality" className="label">สัญชาติ<Req /></label>
                    <input id="reg-nationality" type="text" value={form.nationality} onChange={e => set({ nationality: e.target.value })} placeholder="Nationality" className="input-field" required />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-address" className="label">ที่อยู่<Req /></label>
                  <textarea id="reg-address" value={form.address} onChange={e => set({ address: e.target.value })} placeholder="บ้านเลขที่ หมู่ ซอย ถนน ตำบล/แขวง อำเภอ/เขต" rows={2} className="input-field" required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="reg-province" className="label">จังหวัด<Req /></label>
                    <select id="reg-province" value={form.province} onChange={e => set({ province: e.target.value })} className="input-field" required>
                      {THAI_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="reg-postal" className="label">รหัสไปรษณีย์<Req /></label>
                    <input id="reg-postal" type="text" inputMode="numeric" pattern="[0-9]{5}" title="รหัสไปรษณีย์ 5 หลัก" value={form.postalCode} onChange={e => set({ postalCode: e.target.value })} placeholder="เช่น 20000" className="input-field" required />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-phone" className="label">เบอร์โทรศัพท์มือถือ<Req /></label>
                  <input id="reg-phone" type="tel" value={form.phone} onChange={e => set({ phone: e.target.value })} placeholder="Mobile phone number" className="input-field" required />
                </div>

                <div>
                  <label htmlFor="reg-type" className="label">ประเภทผู้ใช้งาน<Req /></label>
                  <select id="reg-type" value={form.memberType} onChange={e => set({ memberType: e.target.value as MemberType })} className="input-field" required>
                    <option value="" disabled>เลือกประเภทผู้ใช้งาน</option>
                    {MEMBER_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label htmlFor="reg-purpose" className="label">วัตถุประสงค์การใช้งาน<Req /></label>
                  <select id="reg-purpose" value={form.purpose} onChange={e => set({ purpose: e.target.value })} className="input-field" required>
                    <option value="" disabled>เลือกวัตถุประสงค์</option>
                    {MEMBER_PURPOSE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {form.purpose === OTHER && (
                  <div>
                    <label htmlFor="reg-purpose-other" className="label">โปรดระบุวัตถุประสงค์<Req /></label>
                    <input id="reg-purpose-other" type="text" value={form.purposeOther} onChange={e => set({ purposeOther: e.target.value })} placeholder="ระบุวัตถุประสงค์การใช้งาน" className="input-field" required />
                  </div>
                )}

                {/* Consent checkboxes — both required before submitting */}
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg space-y-3">
                  <label className="flex items-start gap-3 text-lg text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.acceptTerms}
                      onChange={e => set({ acceptTerms: e.target.checked })}
                      className="w-5 h-5 mt-0.5 shrink-0 rounded border-gray-300 accent-[#1b3a6b] cursor-pointer"
                      required
                    />
                    <span>ข้าพเจ้ายอมรับเงื่อนไขการใช้งานระบบ<Req /></span>
                  </label>
                  <label className="flex items-start gap-3 text-lg text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.acceptPdpa}
                      onChange={e => set({ acceptPdpa: e.target.checked })}
                      className="w-5 h-5 mt-0.5 shrink-0 rounded border-gray-300 accent-[#1b3a6b] cursor-pointer"
                      required
                    />
                    <span>
                      ข้าพเจ้ายินยอมให้เก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคล
                      ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) และ{' '}
                      <a href={ORG_INFO.pdpaPolicyUrl} target="_blank" rel="noopener noreferrer" className="text-navy-700 underline font-medium hover:text-navy-500">
                        นโยบายการคุ้มครองข้อมูลส่วนบุคคล
                      </a>{' '}
                      ขององค์การบริหารส่วนจังหวัดชลบุรี<Req />
                    </span>
                  </label>
                </div>

                <button type="submit" disabled={submitting} className="btn-primary w-full py-3 text-xl disabled:opacity-60 disabled:cursor-not-allowed">
                  {submitting ? 'กำลังบันทึกข้อมูล...' : 'สมัครสมาชิก'}
                </button>
              </form>
            )}

            {step === 3 && (
              <div className="text-center py-4" role="status">
                <CheckCircle2 size={56} className="text-green-600 mx-auto mb-3" aria-hidden="true" />
                <p className="text-2xl font-bold text-gray-900 mb-1">สมัครสมาชิกเรียบร้อยแล้ว</p>
                <p className="text-lg text-gray-600 mb-5">
                  ยินดีต้อนรับ <span className="font-semibold text-gray-900">{form.name}</span> ท่านสามารถเข้าใช้งานพอร์ทัลประชาชน
                  เพื่อยื่นคำขอข้อมูลภาพจากกล้อง CCTV ได้ทันที
                </p>
                <button onClick={handleEnter} className="btn-primary w-full py-3 text-xl">เข้าสู่ระบบ</button>
              </div>
            )}

            {step !== 3 && (
              <Link to="/login" className="mt-5 flex items-center justify-center gap-1 text-lg text-navy-700 hover:text-navy-500 hover:underline font-medium">
                <ChevronLeft size={18} aria-hidden="true" /> กลับไปหน้าเข้าสู่ระบบ
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
