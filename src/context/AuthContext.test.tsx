import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { saveMember } from '../utils/memberStorage';

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts logged out', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toBeNull();
  });

  it('loginWithThaId succeeds for a seeded staff national ID and persists to localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    let ok = false;
    act(() => {
      ok = result.current.loginWithThaId({ nationalId: '1100200000001', name: 'สมศักดิ์ ผู้ดูแล' });
    });
    expect(ok).toBe(true);
    expect(result.current.user?.role).toBe('admin');
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.canEdit).toBe(true);
    expect(JSON.parse(localStorage.getItem('auth_user')!).username).toBe('admin');
  });

  it('loginWithThaId fails with an unknown national ID', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    let ok = true;
    act(() => {
      ok = result.current.loginWithThaId({ nationalId: '9999999999999', name: 'x' });
    });
    expect(ok).toBe(false);
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
  });

  it('restores the session from localStorage', () => {
    localStorage.setItem(
      'auth_user',
      JSON.stringify({ id: 'u1', name: 'Test', username: 'operator', role: 'operator', email: 'x@x', isActive: true, nationalId: '1100200000002' })
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user?.username).toBe('operator');
    expect(result.current.isOperator).toBe(true);
  });

  it('loginWithThaId creates a citizen session for a registered member', () => {
    saveMember({
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
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    let ok = false;
    act(() => {
      ok = result.current.loginWithThaId({ nationalId: '3100100000009', name: 'สมชาย ใจดี' });
    });
    expect(ok).toBe(true);
    expect(result.current.user?.role).toBe('citizen');
    expect(result.current.isCitizen).toBe(true);
    expect(result.current.canEdit).toBe(false);
  });

  it('loginWithThaId is blocked for a pending member awaiting admin review', () => {
    saveMember({
      id: 'member-pending',
      nationalId: '3100100000010',
      email: 'pending@gmail.com',
      name: 'รอตรวจสอบ ทดสอบ',
      address: '99 หมู่ 1 ต.บ้านสวน อ.เมืองชลบุรี',
      province: 'ชลบุรี',
      postalCode: '20000',
      phone: '0812345678',
      memberType: 'ประชาชน',
      purpose: 'ขอภาพเพื่อดำเนินคดี',
      acceptedTerms: true,
      acceptedPdpa: true,
      registeredAt: '2026-07-15T10:00:00.000Z',
      status: 'pending',
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    let ok = true;
    act(() => {
      ok = result.current.loginWithThaId({ nationalId: '3100100000010', name: 'รอตรวจสอบ ทดสอบ' });
    });
    expect(ok).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('loginWithThaId is blocked for a rejected member', () => {
    saveMember({
      id: 'member-rejected',
      nationalId: '3100100000011',
      email: 'rejected@gmail.com',
      name: 'ถูกปฏิเสธ ทดสอบ',
      address: '99 หมู่ 1 ต.บ้านสวน อ.เมืองชลบุรี',
      province: 'ชลบุรี',
      postalCode: '20000',
      phone: '0812345678',
      memberType: 'ประชาชน',
      purpose: 'ขอภาพเพื่อดำเนินคดี',
      acceptedTerms: true,
      acceptedPdpa: true,
      registeredAt: '2026-07-15T10:00:00.000Z',
      status: 'rejected',
      rejectionReason: 'เอกสารไม่ครบ',
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    let ok = true;
    act(() => {
      ok = result.current.loginWithThaId({ nationalId: '3100100000011', name: 'ถูกปฏิเสธ ทดสอบ' });
    });
    expect(ok).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('loginWithThaId carries mustChangePassword into the session after approval', () => {
    saveMember({
      id: 'member-approved',
      nationalId: '3100100000012',
      email: 'approved@gmail.com',
      name: 'อนุมัติแล้ว ทดสอบ',
      address: '99 หมู่ 1 ต.บ้านสวน อ.เมืองชลบุรี',
      province: 'ชลบุรี',
      postalCode: '20000',
      phone: '0812345678',
      memberType: 'ประชาชน',
      purpose: 'ขอภาพเพื่อดำเนินคดี',
      acceptedTerms: true,
      acceptedPdpa: true,
      registeredAt: '2026-07-15T10:00:00.000Z',
      status: 'approved',
      mustChangePassword: true,
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    let ok = false;
    act(() => {
      ok = result.current.loginWithThaId({ nationalId: '3100100000012', name: 'อนุมัติแล้ว ทดสอบ' });
    });
    expect(ok).toBe(true);
    expect(result.current.user?.mustChangePassword).toBe(true);
  });

  it('loginWithThaId fails when the national ID has no staff or member match', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    let ok = true;
    act(() => {
      ok = result.current.loginWithThaId({ nationalId: '3199999999999', name: 'ไม่รู้จัก' });
    });
    expect(ok).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('loginWithGoogle succeeds for an approved foreign-national member and carries mustChangePassword', () => {
    saveMember({
      id: 'member-foreigner',
      authType: 'google',
      email: 'zhang.san.demo@gmail.com',
      name: 'ZHANG SAN',
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
      registeredAt: '2026-07-15T10:00:00.000Z',
      status: 'approved',
      mustChangePassword: true,
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    let ok = false;
    act(() => {
      ok = result.current.loginWithGoogle({ email: 'zhang.san.demo@gmail.com', name: 'ZHANG SAN' });
    });
    expect(ok).toBe(true);
    expect(result.current.user?.role).toBe('citizen');
    expect(result.current.user?.mustChangePassword).toBe(true);
  });

  it('loginWithGoogle is blocked for a pending foreign-national member', () => {
    saveMember({
      id: 'member-foreigner-pending',
      authType: 'google',
      email: 'pending.foreigner@gmail.com',
      name: 'รอตรวจสอบ ต่างชาติ',
      passportNumber: 'E11111111',
      nationality: 'จีน',
      address: 'โรงแรมในจังหวัดชลบุรี',
      province: 'ชลบุรี',
      postalCode: '20000',
      phone: '0899999998',
      memberType: 'ประชาชน',
      purpose: 'ขอภาพเพื่อดำเนินคดี',
      acceptedTerms: true,
      acceptedPdpa: true,
      registeredAt: '2026-07-15T10:00:00.000Z',
      status: 'pending',
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    let ok = true;
    act(() => {
      ok = result.current.loginWithGoogle({ email: 'pending.foreigner@gmail.com', name: 'รอตรวจสอบ ต่างชาติ' });
    });
    expect(ok).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('logout clears the user and localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => {
      result.current.loginWithThaId({ nationalId: '1100200000001', name: 'สมศักดิ์ ผู้ดูแล' });
    });
    act(() => {
      result.current.logout();
    });
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
  });
});
