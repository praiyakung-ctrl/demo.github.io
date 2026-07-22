import { beforeEach, describe, expect, it } from 'vitest';
import { findMemberByNationalId, savedMembers, saveMember } from './memberStorage';
import type { CitizenMember } from '../types';

const member = (over: Partial<CitizenMember> = {}): CitizenMember => ({
  id: 'member-1',
  nationalId: '3100100000009',
  email: 'somchai@gmail.com',
  name: 'สมชาย ใจดี',
  address: '99 หมู่ 1 ต.บ้านสวน อ.เมืองชลบุรี',
  province: 'ชลบุรี',
  postalCode: '20000',
  phone: '0812345678',
  memberType: 'ประชาชน',
  purpose: 'ขอภาพเพื่อดำเนินคดี',
  acceptedTerms: true,
  acceptedPdpa: true,
  registeredAt: '2026-07-15T10:00:00.000Z',
  ...over,
});

describe('memberStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty list when nothing is stored', () => {
    expect(savedMembers()).toEqual([]);
  });

  it('returns an empty list on invalid JSON', () => {
    localStorage.setItem('registered_members', '{broken');
    expect(savedMembers()).toEqual([]);
  });

  it('returns an empty list when stored value is not an array', () => {
    localStorage.setItem('registered_members', JSON.stringify({ not: 'array' }));
    expect(savedMembers()).toEqual([]);
  });

  it('saves a member and finds it by national ID', () => {
    saveMember(member());
    expect(savedMembers()).toHaveLength(1);
    expect(findMemberByNationalId('3100100000009')?.name).toBe('สมชาย ใจดี');
  });

  it('returns null for an unknown national ID', () => {
    saveMember(member());
    expect(findMemberByNationalId('0000000000000')).toBeNull();
  });

  it('replaces an existing member with the same national ID instead of duplicating', () => {
    saveMember(member());
    saveMember(member({ id: 'member-2', name: 'สมชาย ใจดีมาก' }));
    expect(savedMembers()).toHaveLength(1);
    expect(findMemberByNationalId('3100100000009')?.name).toBe('สมชาย ใจดีมาก');
  });

  it('keeps members with different national IDs', () => {
    saveMember(member());
    saveMember(member({ id: 'member-2', nationalId: '3100100000010' }));
    expect(savedMembers()).toHaveLength(2);
  });
});
