import type { CitizenMember } from '../types';
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
    memberType: 'ประชาชน',
    purpose: 'ขอภาพเพื่อดำเนินคดี',
    acceptedTerms: true,
    acceptedPdpa: true,
    registeredAt: new Date(0).toISOString(),
    status: 'approved',
  });
}
