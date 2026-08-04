import type { CitizenMember } from '../types';
import { MEMBER_PURPOSE_OPTIONS, MEMBER_TYPE_OPTIONS } from '../types';
import { DEMO_THAID_PROFILES } from './thaId';
import { DEMO_GOOGLE_PROFILE } from './googleAuth';

const MEMBERS_KEY = 'registered_members';

export function savedMembers(): CitizenMember[] {
  try {
    const raw = localStorage.getItem(MEMBERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // records saved before the member-review workflow existed have no status
    // field — treat them as already approved so they aren't retroactively
    // locked out of login
    return parsed.map((m: CitizenMember) => ({ ...m, status: m.status ?? 'approved' }));
  } catch {
    return [];
  }
}

export function findMemberByNationalId(nationalId: string): CitizenMember | null {
  return savedMembers().find(m => m.nationalId === nationalId) ?? null;
}

export function findMemberById(id: string): CitizenMember | null {
  return savedMembers().find(m => m.id === id) ?? null;
}

/* foreign nationals registered via Google OAuth have no nationalId, so they
   are looked up by email instead */
export function findMemberByEmail(email: string): CitizenMember | null {
  return savedMembers().find(m => m.authType === 'google' && m.email === email) ?? null;
}

/* pending/rejected applicants have already registered — the generic
   "please register" message would wrongly tell them to sign up again */
export function memberLoginErrorMessage(member: CitizenMember | null, notFoundMessage: string): string {
  if (!member) return notFoundMessage;
  if (member.status === 'pending') return 'ใบสมัครของท่านอยู่ระหว่างการตรวจสอบโดยเจ้าหน้าที่ กรุณารอผลการอนุมัติ';
  if (member.status === 'rejected') {
    return member.rejectionReason
      ? `ใบสมัครของท่านถูกปฏิเสธ เหตุผล: ${member.rejectionReason}`
      : 'ใบสมัครของท่านถูกปฏิเสธ กรุณาติดต่อเจ้าหน้าที่เพื่อสอบถามรายละเอียด';
  }
  return notFoundMessage;
}

export function saveMember(member: CitizenMember): void {
  const others = savedMembers().filter(m =>
    member.authType === 'google' ? m.email !== member.email : m.nationalId !== member.nationalId
  );
  localStorage.setItem(MEMBERS_KEY, JSON.stringify([...others, member]));
}

export function pendingMembers(): CitizenMember[] {
  return savedMembers().filter(m => m.status === 'pending');
}

export function updateMember(id: string, patch: Partial<CitizenMember>): void {
  const target = savedMembers().find(m => m.id === id);
  if (target) saveMember({ ...target, ...patch });
}

/* The "จำลองโปรไฟล์ ThaID: ประชาชน" shortcut on /login logs in as this
   national ID, but a real citizen would only be findable here after
   completing /register — seed a matching member on first use so the demo
   shortcut works the same way the seeded staff accounts already do. */
export function ensureDemoCitizenRegistered(): void {
  const { nationalId, name } = DEMO_THAID_PROFILES.citizen;
  if (findMemberByNationalId(nationalId)) return;
  saveMember({
    id: 'demo-citizen',
    nationalId,
    email: 'citizen.demo@example.com',
    name,
    address: '1 ถนนสุขุมวิท ต.บางปลาสร้อย อ.เมืองชลบุรี',
    province: 'ชลบุรี',
    postalCode: '20000',
    phone: '0810000000',
    memberType: 'ประชาชน',
    purpose: 'ขอภาพเพื่อดำเนินคดี',
    acceptedTerms: true,
    acceptedPdpa: true,
    registeredAt: new Date(0).toISOString(),
  });
}

/* The "จำลองบัญชี Google (Demo)" shortcut on /login logs in as this email,
   but a foreign national would only be findable here after completing
   /register/foreigner — seed an already-approved member on first use, same
   as ensureDemoCitizenRegistered() above, so the demo shortcut can log in
   immediately without going through the admin approval queue. */
export function ensureDemoForeignerRegistered(): void {
  const { email, name } = DEMO_GOOGLE_PROFILE;
  if (findMemberByEmail(email)) return;
  saveMember({
    id: 'demo-foreigner',
    authType: 'google',
    email,
    name,
    passportNumber: 'E88888888',
    nationality: 'จีน',
    address: 'โรงแรมในจังหวัดชลบุรี (ที่พักชั่วคราว)',
    province: 'ชลบุรี',
    postalCode: '20000',
    phone: '0899999999',
    memberType: 'ชาวต่างชาติ',
    purpose: 'ขอภาพเพื่อดำเนินคดี',
    acceptedTerms: true,
    acceptedPdpa: true,
    registeredAt: new Date('2026-06-01').toISOString(),
    status: 'approved',
  });
}

const DAY_MS = 86_400_000;

/* Demo-only: the "ตรวจสอบสมาชิกใหม่" back-office page has nothing to show
   until real citizens register, so seed a handful of pending applications
   (mix of ThaID citizens and Google-verified foreign nationals) the first
   time the page loads, so the approve/reject workflow can be demonstrated. */
export function ensureDemoPendingMembers(): void {
  if (savedMembers().length > 0) return;

  const thaidApplicants = [
    { name: 'มานพ ใจดี', nationalId: '3100100000101' },
    { name: 'สุนีย์ รักเรียน', nationalId: '3100100000102' },
    { name: 'ประเสริฐ ตั้งมั่น', nationalId: '3100100000103' },
    { name: 'วิไล ศรีสุข', nationalId: '3100100000104' },
    { name: 'ธีระ พงษ์พันธ์', nationalId: '3100100000105' },
    { name: 'อรุณี แสงทอง', nationalId: '3100100000106' },
  ];

  const googleApplicants = [
    { name: 'John Smith', email: 'john.smith.demo@example.com', passportNumber: 'K12345678', nationality: 'อังกฤษ' },
    { name: 'Li Wei', email: 'li.wei.demo@example.com', passportNumber: 'E99887766', nationality: 'จีน' },
  ];

  thaidApplicants.forEach((applicant, idx) => {
    saveMember({
      id: `demo-pending-${idx + 1}`,
      nationalId: applicant.nationalId,
      email: `pending${idx + 1}.demo@example.com`,
      name: applicant.name,
      address: '99 ถนนสุขุมวิท ต.บางปลาสร้อย อ.เมืองชลบุรี',
      province: 'ชลบุรี',
      postalCode: '20000',
      phone: `08${(10000000 + idx).toString().padStart(8, '0')}`,
      memberType: MEMBER_TYPE_OPTIONS[idx % MEMBER_TYPE_OPTIONS.length],
      purpose: MEMBER_PURPOSE_OPTIONS[idx % MEMBER_PURPOSE_OPTIONS.length],
      acceptedTerms: true,
      acceptedPdpa: true,
      registeredAt: new Date(Date.now() - (idx + 1) * 1.7 * DAY_MS).toISOString(),
      status: 'pending',
    });
  });

  googleApplicants.forEach((applicant, idx) => {
    const seq = thaidApplicants.length + idx + 1;
    saveMember({
      id: `demo-pending-${seq}`,
      authType: 'google',
      email: applicant.email,
      name: applicant.name,
      passportNumber: applicant.passportNumber,
      nationality: applicant.nationality,
      address: 'โรงแรมในจังหวัดชลบุรี (ที่พักชั่วคราว)',
      province: 'ชลบุรี',
      postalCode: '20000',
      phone: `09${(90000000 + idx).toString().padStart(8, '0')}`,
      memberType: MEMBER_TYPE_OPTIONS[seq % MEMBER_TYPE_OPTIONS.length],
      purpose: MEMBER_PURPOSE_OPTIONS[seq % MEMBER_PURPOSE_OPTIONS.length],
      acceptedTerms: true,
      acceptedPdpa: true,
      registeredAt: new Date(Date.now() - (seq + 1) * 1.7 * DAY_MS).toISOString(),
      status: 'pending',
    });
  });
}
