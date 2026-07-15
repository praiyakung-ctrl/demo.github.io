import { beforeEach, describe, expect, it } from 'vitest';
import { findMemberBySub, savedMembers, saveMember } from './memberStorage';
import type { CitizenMember } from '../types';

const member = (over: Partial<CitizenMember> = {}): CitizenMember => ({
  id: 'member-1',
  googleSub: '10842171234567892731',
  email: 'somchai@gmail.com',
  name: 'สมชาย ใจดี',
  address: '99 หมู่ 1 ต.บ้านสวน อ.เมืองชลบุรี',
  province: 'ชลบุรี',
  postalCode: '20000',
  phone: '0812345678',
  memberType: 'ประชาชน',
  purpose: 'ขอภาพเพื่อดำเนินคดี',
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

  it('saves a member and finds it by Google sub', () => {
    saveMember(member());
    expect(savedMembers()).toHaveLength(1);
    expect(findMemberBySub('10842171234567892731')?.name).toBe('สมชาย ใจดี');
  });

  it('returns null for an unknown sub', () => {
    saveMember(member());
    expect(findMemberBySub('other-sub')).toBeNull();
  });

  it('replaces an existing member with the same sub instead of duplicating', () => {
    saveMember(member());
    saveMember(member({ id: 'member-2', name: 'สมชาย ใจดีมาก' }));
    expect(savedMembers()).toHaveLength(1);
    expect(findMemberBySub('10842171234567892731')?.name).toBe('สมชาย ใจดีมาก');
  });

  it('keeps members with different subs', () => {
    saveMember(member());
    saveMember(member({ id: 'member-2', googleSub: 'another-sub' }));
    expect(savedMembers()).toHaveLength(2);
  });
});
