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

export function findMemberBySub(googleSub: string): CitizenMember | null {
  return savedMembers().find(m => m.googleSub === googleSub) ?? null;
}

export function saveMember(member: CitizenMember): void {
  const others = savedMembers().filter(m => m.googleSub !== member.googleSub);
  localStorage.setItem(MEMBERS_KEY, JSON.stringify([...others, member]));
}
