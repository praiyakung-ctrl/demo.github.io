import type { CitizenMember } from '../types';
import { DEMO_THAID_PROFILES } from './thaId';

const MEMBERS_KEY = 'registered_members';

export function savedMembers(): CitizenMember[] {
  try {
    const raw = localStorage.getItem(MEMBERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function findMemberByNationalId(nationalId: string): CitizenMember | null {
  return savedMembers().find(m => m.nationalId === nationalId) ?? null;
}

export function saveMember(member: CitizenMember): void {
  const others = savedMembers().filter(m => m.nationalId !== member.nationalId);
  localStorage.setItem(MEMBERS_KEY, JSON.stringify([...others, member]));
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
