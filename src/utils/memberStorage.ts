import type { CitizenMember } from '../types';

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
