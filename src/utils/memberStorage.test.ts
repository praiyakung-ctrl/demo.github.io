import { beforeEach, describe, expect, it } from 'vitest';
import {
  ensureDemoCitizenRegistered,
  ensureDemoForeignerRegistered,
  findMemberByEmail,
  findMemberById,
  findMemberByNationalId,
  pendingMembers,
  savedMembers,
  saveMember,
  updateMember,
} from './memberStorage';
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

  it('treats a legacy record with no status field as already approved', () => {
    // records saved before the member-review workflow existed have no
    // `status` key at all — write one directly, bypassing saveMember, to
    // simulate that legacy shape
    const legacy = member();
    delete (legacy as Partial<CitizenMember>).status;
    localStorage.setItem('registered_members', JSON.stringify([legacy]));
    expect(savedMembers()[0].status).toBe('approved');
  });

  it('does not override an explicit status when normalizing', () => {
    saveMember(member({ status: 'pending' }));
    expect(savedMembers()[0].status).toBe('pending');
  });

  it('finds a Google-authenticated member by email but not a ThaID member', () => {
    saveMember(member({ authType: 'google', nationalId: undefined, email: 'foreigner@gmail.com' }));
    expect(findMemberByEmail('foreigner@gmail.com')?.authType).toBe('google');
    saveMember(member({ id: 'member-2', email: 'thai@example.com' })); // authType 'thaid' (default)
    expect(findMemberByEmail('thai@example.com')).toBeNull();
  });

  it('finds a member by id', () => {
    saveMember(member());
    expect(findMemberById('member-1')?.nationalId).toBe('3100100000009');
    expect(findMemberById('missing')).toBeNull();
  });

  describe('pendingMembers', () => {
    it('returns only members with status pending', () => {
      saveMember(member({ id: 'm-pending', nationalId: '3100100000001', status: 'pending' }));
      saveMember(member({ id: 'm-approved', nationalId: '3100100000002', status: 'approved' }));
      saveMember(member({ id: 'm-rejected', nationalId: '3100100000003', status: 'rejected' }));
      expect(pendingMembers().map(m => m.id)).toEqual(['m-pending']);
    });

    it('returns an empty list when there are no pending members', () => {
      saveMember(member({ status: 'approved' }));
      expect(pendingMembers()).toEqual([]);
    });
  });

  describe('updateMember', () => {
    it('patches an existing member in place, preserving the rest of the record', () => {
      saveMember(member({ status: 'pending' }));
      updateMember('member-1', { status: 'approved', reviewedBy: 'admin', mustChangePassword: true });
      const updated = findMemberById('member-1')!;
      expect(updated.status).toBe('approved');
      expect(updated.reviewedBy).toBe('admin');
      expect(updated.mustChangePassword).toBe(true);
      expect(updated.name).toBe('สมชาย ใจดี'); // untouched fields survive
      expect(savedMembers()).toHaveLength(1); // no duplicate created
    });

    it('is a no-op for an unknown id', () => {
      saveMember(member());
      updateMember('missing', { status: 'approved' });
      expect(savedMembers()).toHaveLength(1);
      expect(savedMembers()[0].status).toBe('approved'); // normalized default, not from the patch
    });
  });

  describe('ensureDemoCitizenRegistered', () => {
    it('seeds a demo citizen member once, and is idempotent on repeated calls', () => {
      ensureDemoCitizenRegistered();
      ensureDemoCitizenRegistered();
      expect(savedMembers().filter(m => m.id === 'demo-citizen')).toHaveLength(1);
      expect(findMemberByNationalId('3100100000001')?.status).toBe('approved');
    });
  });

  describe('ensureDemoForeignerRegistered', () => {
    it('seeds an already-approved demo foreign member once, and is idempotent', () => {
      ensureDemoForeignerRegistered();
      ensureDemoForeignerRegistered();
      const demo = savedMembers().filter(m => m.id === 'demo-foreigner');
      expect(demo).toHaveLength(1);
      expect(demo[0].status).toBe('approved');
      expect(demo[0].authType).toBe('google');
      expect(findMemberByEmail('zhang.san.demo@gmail.com')?.name).toBe('ZHANG SAN');
    });
  });
});
