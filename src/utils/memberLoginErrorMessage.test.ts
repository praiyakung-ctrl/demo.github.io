import { describe, expect, it } from 'vitest';
import { memberLoginErrorMessage } from './memberStorage';
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

const NOT_FOUND = 'ไม่พบบัญชีที่ผูกกับ ThaID นี้ กรุณาสมัครสมาชิกก่อนเข้าใช้งาน';

describe('memberLoginErrorMessage', () => {
  it('falls back to the generic not-found message when no member matches', () => {
    expect(memberLoginErrorMessage(null, NOT_FOUND)).toBe(NOT_FOUND);
  });

  it('tells a pending applicant their application is under review, not to register again', () => {
    const msg = memberLoginErrorMessage(member({ status: 'pending' }), NOT_FOUND);
    expect(msg).toContain('อยู่ระหว่างการตรวจสอบ');
    expect(msg).not.toBe(NOT_FOUND);
  });

  it('tells a rejected applicant their application was rejected, including the reason when set', () => {
    const msg = memberLoginErrorMessage(member({ status: 'rejected', rejectionReason: 'เอกสารไม่ครบ' }), NOT_FOUND);
    expect(msg).toContain('ถูกปฏิเสธ');
    expect(msg).toContain('เอกสารไม่ครบ');
  });

  it('tells a rejected applicant without a stored reason to contact staff', () => {
    const msg = memberLoginErrorMessage(member({ status: 'rejected' }), NOT_FOUND);
    expect(msg).toContain('ถูกปฏิเสธ');
    expect(msg).toContain('ติดต่อเจ้าหน้าที่');
  });

  it('falls back to the generic not-found message for an approved member (should not reach this path in practice)', () => {
    expect(memberLoginErrorMessage(member({ status: 'approved' }), NOT_FOUND)).toBe(NOT_FOUND);
  });
});
