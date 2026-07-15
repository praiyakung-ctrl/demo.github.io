import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AccessibilityToolbar } from '../components/AccessibilityToolbar';
import { signInWithGoogle } from '../utils/googleAuth';
import type { GoogleProfile } from '../utils/googleAuth';
import { findMemberBySub, saveMember } from '../utils/memberStorage';
import { MEMBER_PURPOSE_OPTIONS, MEMBER_TYPE_OPTIONS } from '../types';
import type { CitizenMember, MemberType } from '../types';

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
  'ชื่อ-นามสกุล และรูปโปรไฟล์ (ถ้ามี) จากบัญชี Google',
  'อีเมล และ Google Account ID',
  'ที่อยู่ จังหวัด รหัสไปรษณีย์ และเบอร์โทรศัพท์มือถือ',
  'ประเภทผู้ใช้งาน และวัตถุประสงค์การใช้งาน',
];

interface ProfileForm {
  name: string;
  address: string;
  province: string;
  postalCode: string;
  phone: string;
  memberType: MemberType | '';
  purpose: string;
  purposeOther: string;
}

export function RegisterPage() {
  const { loginAsGoogle } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [connecting, setConnecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [google, setGoogle] = useState<GoogleProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    name: '', address: '', province: 'ชลบุรี', postalCode: '', phone: '',
    memberType: '', purpose: '', purposeOther: '',
  });

  const set = (patch: Partial<ProfileForm>) => setForm(f => ({ ...f, ...patch }));

  const handleGoogleSignIn = async () => {
    setConnecting(true);
    const profile = await signInWithGoogle();
    setConnecting(false);
    if (findMemberBySub(profile.sub)) {
      setAlreadyRegistered(true);
      return;
    }
    setGoogle(profile);
    set({ name: profile.name });
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!google || !form.memberType) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    const member: CitizenMember = {
      id: `member-${Date.now()}`,
      googleSub: google.sub,
      email: google.email,
      name: form.name,
      picture: google.picture,
      address: form.address,
      province: form.province,
      postalCode: form.postalCode,
      phone: form.phone,
      memberType: form.memberType,
      purpose: form.purpose === OTHER && form.purposeOther ? `อื่นๆ (${form.purposeOther})` : form.purpose,
      registeredAt: new Date().toISOString(),
    };
    saveMember(member);
    setSubmitting(false);
    setStep(3);
  };

  const handleEnter = () => {
    if (!google) return;
    loginAsGoogle({ name: form.name, email: google.email });
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
            <h1 className="text-white text-4xl font-bold">สมัครสมาชิกสำหรับประชาชน</h1>
            <p className="text-blue-200 text-2xl">ระบบฐานข้อมูลเพื่อการเข้าถึง Data Integration and End Users</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {step === 1 && !alreadyRegistered && (
              <>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <UserPlus size={36} className="text-navy-700" aria-hidden="true" />
                  <h2 className="text-3xl font-bold text-gray-900">เริ่มต้นสมัครสมาชิก</h2>
                </div>
                <p className="text-lg text-gray-600 mb-4">
                  สมัครสมาชิกด้วยการยืนยันตัวตนผ่านบัญชี Google (OAuth 2.0)
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
                <button
                  onClick={handleGoogleSignIn}
                  disabled={connecting}
                  className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-3 text-2xl font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  {connecting ? 'กำลังเชื่อมต่อ Google...' : 'สมัครสมาชิกด้วย Google'}
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
                    <p className="text-lg font-semibold text-gray-700">บัญชี Google ที่ยืนยันแล้ว</p>
                  </div>
                  <div>
                    <label htmlFor="reg-email" className="label">อีเมล (Google Email)</label>
                    <input id="reg-email" type="email" value={google.email} readOnly className="input-field bg-gray-100 text-gray-500" />
                  </div>
                  <div>
                    <label htmlFor="reg-sub" className="label">Google Account ID (sub)</label>
                    <input id="reg-sub" type="text" value={google.sub} readOnly className="input-field bg-gray-100 text-gray-500 font-mono" />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-name" className="label">ชื่อ-นามสกุล *</label>
                  <input id="reg-name" type="text" value={form.name} onChange={e => set({ name: e.target.value })} placeholder="กรอกชื่อ-นามสกุล" className="input-field" required />
                </div>

                <div>
                  <label htmlFor="reg-address" className="label">ที่อยู่ *</label>
                  <textarea id="reg-address" value={form.address} onChange={e => set({ address: e.target.value })} placeholder="บ้านเลขที่ หมู่ ซอย ถนน ตำบล/แขวง อำเภอ/เขต" rows={2} className="input-field" required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="reg-province" className="label">จังหวัด *</label>
                    <select id="reg-province" value={form.province} onChange={e => set({ province: e.target.value })} className="input-field" required>
                      {THAI_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="reg-postal" className="label">รหัสไปรษณีย์ *</label>
                    <input id="reg-postal" type="text" inputMode="numeric" pattern="[0-9]{5}" title="รหัสไปรษณีย์ 5 หลัก" value={form.postalCode} onChange={e => set({ postalCode: e.target.value })} placeholder="เช่น 20000" className="input-field" required />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-phone" className="label">เบอร์โทรศัพท์มือถือ *</label>
                  <input id="reg-phone" type="tel" inputMode="numeric" pattern="0[0-9]{9}" title="เบอร์มือถือ 10 หลัก ขึ้นต้นด้วย 0" value={form.phone} onChange={e => set({ phone: e.target.value })} placeholder="เช่น 0812345678" className="input-field" required />
                </div>

                <div>
                  <label htmlFor="reg-type" className="label">ประเภทผู้ใช้งาน *</label>
                  <select id="reg-type" value={form.memberType} onChange={e => set({ memberType: e.target.value as MemberType })} className="input-field" required>
                    <option value="" disabled>เลือกประเภทผู้ใช้งาน</option>
                    {MEMBER_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label htmlFor="reg-purpose" className="label">วัตถุประสงค์การใช้งาน *</label>
                  <select id="reg-purpose" value={form.purpose} onChange={e => set({ purpose: e.target.value })} className="input-field" required>
                    <option value="" disabled>เลือกวัตถุประสงค์</option>
                    {MEMBER_PURPOSE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {form.purpose === OTHER && (
                  <div>
                    <label htmlFor="reg-purpose-other" className="label">โปรดระบุวัตถุประสงค์ *</label>
                    <input id="reg-purpose-other" type="text" value={form.purposeOther} onChange={e => set({ purposeOther: e.target.value })} placeholder="ระบุวัตถุประสงค์การใช้งาน" className="input-field" required />
                  </div>
                )}

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
